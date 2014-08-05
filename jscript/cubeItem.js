define([],function(){

	function distance(x1,y1,z1,x2,y2,z2)
{
    var xmag=x1-x2;
    var ymag=y1-y2;
    var zmag=z1-z2;
    return Math.sqrt(xmag*xmag + ymag*ymag + zmag*zmag);
};

	function sparseItem(name, x, y, z)
{
    this.name=name;
    var me=this;
    var alive=true;
    var parentTree=null;

    this.getPos=function()
	{
	    if (!alive) {
		throw "dead";
	    } 
	    return {x:x,y:y,z:z};
	};

    this.isAlive=function(){return alive;}

    this.destroy=function(){alive=false;}

    this.movePos=function(X,Y,Z){
	if (!parentTree)
	    {
		x=X;
		y=Y; 
		z=Z;
		return this.getPos();
	    }
	else
	    {
		var newPos=parentTree.moveItem(me,X,Y,Z);
		if (newPos)
		    {
			x=X;
			y=Y;
			z=Z;
		    }
		return this.getPos();
	    }
    };

    this.setXY=function(X,Y,Z){  //this function should only be called by the tree
	x=X; y=Y; z=Z;
    };

    this.distanceTo=function(X,Y,Z)
    {
	if (X.x) return this.distanceTo(X.x,X.y,X.z);
	return distance(X,Y,Z,me.getPos().x,me.getPos().y,me.getPos().z);
    };

    this.setSparseParent=function(parentNode){parentTree=parentNode;}
};

return sparseItem;
});
