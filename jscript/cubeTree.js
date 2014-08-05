define([],function(){  //you only need to "require" what you need to use.  any object in javascript can have any method, so "require" is only
	//needed if you need the constructor or the package.

	//var console={log:function(){}};

function distance(x1,y1,z1,x2,y2,z2)
{
    var xmag=x1-x2;
    var ymag=y1-y2;
    var zmag=z1-z2;
    return Math.sqrt(xmag*xmag + ymag*ymag + zmag*zmag);
};

function cubeTree(x,y,z,Width,Height,Depth,treeDepth,parent)
{
    var me=this;

    var maxItemSize=0;

    var children=[[[null,null],[null,null]],[[null,null],[null,null]]];

    var payloadList=[];  //we hold the items here.

    var width=Width;
    var height=Height;
    var depth=Depth;

    this.substring=function(){}

    this.reset=function()
	{ 
	    //this function does not call destroy and is only intended for use by the testing suite stress tests.
	    payloadList=[];
	    children=[[[null,null],[null,null]],[[null,null],[null,null]]];
	}

    this.getMaxItemSize=function()
	{
	    return maxItemSize;
	}
    
    this.checkMaxItemSize=function(size)
	{
	    if (maxItemSize<size){
		maxItemSize=size;
		console.log("maxItemSize set to "+maxItemSize);
		if (parent){
		    parent.checkMaxItemSize(size);
		}
	    }
	}

    this.removeItemSize=function(size)
	{
	    
	    var childrenSize=0;
	    
	    if (maxItemSize==size)
		{
		    if (treeDepth)
			{
			    children.forEach(function(row){
				    row.forEach(function(child){
					    if (child && child.getMaxItemSize()>childrenSize){
						childrenSize=child.getMaxItemSize();
					    }
					})
					});
			    maxItemSize=childrenSize;
			}
		    else
			{
			    payloadList.forEach(function(item){
				    if (item.getItemSize){
					if (item.getItemSize()>childrenSize){
					    childrenSize=item.getItemSize();
					}
				    }
				});
			    maxItemSize=childrenSize;
			}
		    
		    //if the size changed, then if we have a parent, we need to give the parent a chance to update it's max size
		    if (maxItemSize!=size)
			{
			    if (parent)
				{
				    parent.removeItemSize(size);  //not maxItemSize, original size, so that if the parent's maxSize was that, it recalcs
				}
			}
		}
	    else if (maxItemSize<size){
		//if maxItemSize was less than size, the tree went crazy.  Get out.
		throw {err:"tree went crazy, maxItemSize ("+maxItemSize+") was less than size ("+size+")"};
	    }
	    //otherwise, maxItemSize > size, and all is copacetic.
	}
 
    
    this.getItemOwner=function(item)
	{
	    if (item.getPos) return null;
	    return me;
	}
    
    this.idString=function()
	{
	    return "{depth:"+treeDepth+",xrange:["+x+"-"+(x+width)+"),yrange:["+y+"-"+(y+height)+"),zrange:["+z+"-"+(z+depth)+")}";
	}

    this.moveItem=function(item,X,Y,Z)
	{
	    // console.log(this.idString()+" moving to ("+X+","+Y+")");
	    //	    if (X< || Y<0) return null;
	    if (X<x || Y<y || X>=(x+width) || Y>=(y+height) || Z<z || Z>=(z+depth))
		{
		    //it's out of this one's bounds.  if it's in the payloadList, remove it.
		    var pIndex=payloadList.indexOf(item);
		    if (pIndex>=0) 
			{
			    payloadList.splice(pIndex,1);
			    if (item.getItemSize)
				{
				    this.removeItemSize(item.getItemSize());
				}
			}
		    return parent.moveItem(item,X,Y,Z);
		}
	    if (treeDepth>0)
		{
		    this.child(X,Y,Z).moveItem(item,X,Y,Z);
		}
	    else
		{
		    if (payloadList.indexOf(item)==-1)
			{
			    payloadList.push(item);
			    item.setSparseParent(me);
			    if (item.getItemSize)
				{
				    this.checkMaxItemSize(item.getItemSize());
				}
			}
		}
	    return true;
	}
    
    this.destroyItem=function(item)
	{
	    if (treeDepth)
		{
		    this.child(item.getPos().x,item.getPos().y,item.getPos().z).destroyItem(item);
		}
	    else
		{
		    var pIndex=payloadList.indexOf(item);
		    if (pIndex>=0)
			{
			    item.destroy();
			    payloadList.splice(pIndex,1);
			    if (item.getItemSize){
				this.removeItemSize(item.getItemSize());
			    }
			}
		}
	}
    
    //a square matches anything between its coordinates inclusive and its coords plus its dimensions, exclusive 

    this.getMinDistTo=function(X,Y,Z)
	{
	    var checkX,checkY,checkZ;
	    if (X >= x && 
		X < x+width && 
		Y >= y && 
		Y < y+height &&
		Z >= z &&
		Z < z+depth) return 0;  //if it's inbounds, the minimum distance is 0
	    //otherwise, we look for the nearest corner, and measure from there.  in case of ties, who cares, the distance to either would be the same
	    if (X<x+(width/2)) checkX=x;
	    else checkX=x+width;
	    if (Y<y+(height/2)) checkY=y;
	    else checkY=y+height;
	    if (Z<z+(depth/2)) checkZ=z;
	    else checkZ=z+depth;
	    return distance(X,Y,Z,checkX,checkY,checkZ);
	}
    
    this.getMaxDistTo=function(X,Y,Z)
	{
	    var checkX,checkY,checkZ;
	    //max distance to a coordinate pair is always at least half-width and half-height
	    if (X>=x+(width/2)) checkX=x;
	    else checkX=x+width;
	    if (Y>=y+(height/2)) checkY=y;
	    else checkY=y+height;
	    if (Z>=z+(depth/2)) checkZ=z;
	    else checkZ=z+depth;
	    return distance(X,Y,Z,checkX,checkY,checkZ);
	}
    
    this.getProximateList=function(params)
	{
	    var ret=[];
	    if (typeof params=='undefined') params={};
	    //returns an array of all items matching params.  params may have top, bottom, left, and right properties, or x,y, and range properties
	    //if neither of those conditions is true, returns the whole payloadList
	    if (typeof params.top == 'undefined' || 
		typeof params.bottom == 'undefined' || 
		typeof params.left == 'undefined' || 
		typeof params.right == 'undefined' || 
		typeof params.zleast == 'undefined' ||
		typeof params.zmost == 'undefined')
		{
		    if (typeof params.center != 'undefined')
			{
			    if (typeof params.center.x != 'undefined')
				{
				    params.x=params.center.x;
				    params.y=params.center.y;
				    params.z=params.center.z;
				}
			    else
				{
				    params.x=params.center.X;
				    params.y=params.center.Y;
				    params.z=params.center.Z;
				}
			}
		
		    if (typeof params.x == 'undefined' || typeof params.y == 'undefined' || typeof params.z == 'undefined' || typeof params.range == 'undefined')
			{
			    if (treeDepth)
				{
				    children.forEach(function(plane){
					    plane.forEach(function(col){
					          col.forEach(function(child){
						         if (child){
					    	   	    ret=ret.concat(child.getProximateList({}));
					    	         }
					      	      })
						   })
						});
				    return ret;
				}
			    else
				{
				    return payloadList.slice(0);
				}
			}
		    else
			{
			    params.top=params.y-params.range;
			    params.bottom=params.y+params.range;
			    params.left=params.x-params.range;
			    params.right=params.x+params.range;
			    params.zleast=params.z-params.range;
			    params.zmost=params.z+params.range;
			}
		}
	    //console.log(this.idString());
	    
	    var essentialRow=function(row){
		//console.log(row);
		//console.log("["+params.top+" <-> "+params.bottom+"]");
		if (params.top<y+(height/2))
		    {
			if (row[0])
			    {
				//console.log("row 0");
				ret=ret.concat(row[0].getProximateList(params));
			    }
		    }
		if (params.bottom>=y+(height/2))
		    {
			if (row[1])
			    {
				//console.log("row 1");
				ret=ret.concat(row[1].getProximateList(params));
			    }
		    }
	    };

	    var processPlane=function(plane){
		if (params.left<x+(width/2))
		    {
			essentialRow(plane[0]);
		    }
		if (params.right>=x+(width/2))
		    {
			essentialRow(plane[1]);
		    }
	    }
	    
	    if (treeDepth)
		{
		    if (params.zleast<z+(depth/2))
			{
			    processPlane(children[0]);
			}
		    if (params.zmost>=z+(depth/2))
			{
			    processPlane(children[1]);
			}
		}
	    else
		{
		    if ((params.top<y) && 
			(params.bottom>(y+height)) && 
			(params.left<x) && 
			(params.right>(x+width)) &&
			(params.zleast<z) && 
			(params.zmost>(z+depth)))
			{
			    ret=payloadList.slice(0);
			}
		    ret=payloadList.filter(function(a){
			    var pos=a.getPos();
			    if (pos.x<params.left) return false;
			    if (pos.x>params.right) return false;
			    if (pos.y<params.top) return false;
			    if (pos.y>params.bottom) return false;
			    if (pos.z<params.zleast) return false;
			    if (pos.z>params.zmost) return false;
			    return true;
			});
		    
		    //at this point, ret contains a list of all the items in the cube... if we have x,y,z and range, we need
		    //to check if we need to further refine the list.
		    if ((typeof params.x != 'undefined') && 
			(typeof params.y != 'undefined') && 
			(typeof params.z != 'undefined') && 
			(typeof params.range != 'undefined'))
			{
			    if (this.getMaxDistTo(params.x,params.y,params.z)>=params.range)
				{
				    //if I have points outside range from x,y,z, I need to filter.
				    var rangeSquared=params.range*params.range;
				    //console.log("params.point {"+params.x+","+params.y+"}")
					ret=ret.filter(function(a){
						var diffX=params.x-a.getPos().x, diffY=params.y-a.getPos().y, diffZ=params.z-a.getPos().z;
						var rangeSquaredTo=(diffX*diffX)+(diffY*diffY)+(diffZ*diffZ)
						//console.log("range to {"+a.getPos().x+","+a.getPos().y+"} "+rangeSquaredTo+" vs "+rangeSquared);
						return (rangeSquaredTo<rangeSquared);
					    });
				}
			}
		    
		    
		}
	    
	    
	    return ret;
    }

    this.toString=function(prefix)
    {
	//pass
	if (!prefix) prefix=" ";
	var ret=prefix+this.idString()+payloadList.length+"\n";
	children.forEach(function(col){
		col.forEach(function(child){
			if (child){
			    ret+=child.toString(prefix+" ");
			}
			else
			    {
				ret+=prefix+" null\n";
			    }
		    })
		    });
		
	return ret;
    }

    this.child=function(X,Y,Z)
    {
	var plane=0,row=0,col=0,childZ=z,childX=x,childY=y;
	if (Z>=(z+(depth/2)))
	    {
		plane=1;
		childZ+=depth/2;
	    }
	if (X>=(x+(width/2)))
	    {
		col=1;
		childX+=width/2;
	    }
	if (Y>=(y+(height/2)))
	    {
		row=1;
		childY+=height/2;
	    }
	if (!children[plane][col][row])
	    {
		children[plane][col][row]=new cubeTree(childX,childY,childZ,width/2,height/2,depth/2,treeDepth-1,me);
	    }
	return children[plane][col][row];
    }

    this.addItem=function(item)
    {
	//validates.  only adds items with a getPos method
	//only adds items in valid range.
	if (!item.getPos) return null;
	if (!item.getPos()) return null;
	var item_x, item_y,item_z;
	item_x=item.getPos().x;
	item_y=item.getPos().y;
	item_z=item.getPos().z;
	if (item_x<0) return null;
	if (item_y<0) return null;
	if (item_z<0) return null;
	if (item_x>x+width) return null;
	if (item_y>y+height) return null;
	if (item_z>z+depth) return null;
	if (treeDepth)
	    {
		return this.child(item_x,item_y,item_z).addItem(item);
	    }
	else
	    {
		payloadList.push(item);
		if (item.getItemSize){
		    this.checkMaxItemSize(item.getItemSize());
		}
	    }

	if (item.setSparseParent)
	    {
		item.setSparseParent(me);
	    }
	return item;
    }
    
}

cubeTree.prototype.distance=distance;

return cubeTree;
//window.squareTree=squareTree;    

//exports.squareTree=squareTree;

    });


