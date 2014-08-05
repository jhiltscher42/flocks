define(["vector3d","cubeTree","cubeItem","Stopwatch"],function(vector,cubeTree,cubeItem,Stopwatch){
	var CANVAS_WIDTH, CANVAS_HEIGHT, MODEL_DEPTH=2000,
	FLOCK_POPULATION=1,
	config={MAX_SPEED:20,
		NEIGHBOR_DISTANCE:100,
		REPULSION_FACTOR:1.05,
		CENTRAL_ATTRACTION:1,
		GROUP_DIR_ATTRACTION:1,
		EDGE_DISTANCE:100,
		SMOOTHING_FACTOR:5,
		MAX_LAG_MS:35,
		MIN_LAG_MS:25,
		ERASE_INSURANCE:1,
		BIRD_WIDTH:20,
		BIRD_HEIGHT:20,
    };
    
    if (!console) console={};
    if (!console.log) console.log=function(){}
    

    var canvas,cGC;

    var canvasOffset={left:0,top:0};
    var currentCameraCoords;

    var n=0;

    var mustKill=false;

    var trackingTree;

    window.flockConfig=config;

    window.maxes={};
    window.mins={EDGE_DISTANCE:40};

    var els=[];

    for (var el in config) {
	window.maxes[el]=10;
	els.push(el);
    }
    window.maxes.BIRD_HEIGHT=window.maxes.BIRD_WIDTH=40;
    window.maxes.NEIGHBOR_DISTANCE=window.maxes.EDGE_DISTANCE=300;
    window.maxes.MAX_SPEED=100;
    window.maxes.ERASE_INSURANCE=2;
    els=els.filter(function(el){return el.indexOf("_LAG_")==-1;});
    var guard=function(el,max,min){
	if (el<0) return 0;
	if (min && el<min) return min;
	if (el>max) return max;
	return el;
    };

    window.perturbLog=console.log;

    window.perturb=function()
    {
	var el=els[Math.floor(Math.random()*els.length)];
	var newVal=guard(config[el]+(Math.random()*3)-1.5,maxes[el],mins[el]);
	config[el]=newVal;
	//	console.log(el+" to "+newVal);
    }
    
    window.perturbThread=setInterval(perturb,100);

    var flockers=[];

    var makeAFlocker=function()
    {
	var flocker=new cubeItem(flockers.length,Math.random()*CANVAS_WIDTH, Math.random()*CANVAS_HEIGHT,Math.random()*MODEL_DEPTH);
	flocker.colorTimer=0;
	flocker.color='rgb(255,255,255)';
	flocker.setColor=function(newcolor)
	{
	    this.color=newcolor;
	    this.colorTimer=0;
	}
	flocker.forwardColor=function(el){
	    el.colorTimer++;
	    if (el.colorTimer>=20)
		{
		    el.colorTimer=0;
		    if ((Math.random()*100) <= 10)
			{
			    el.color='rgb('+(Math.floor(Math.random()*100)+155)+","+
					      (Math.floor(Math.random()*100)+155)+","+
					  (Math.floor(Math.random()*100)+155)+")";
			    //this.color='rgb(255,0,0)';
			}
		    else
			{
			    el.neighbors.forEach(function(neighbor){neighbor.mate.color=el.color; neighbor.mate.colorTimer=0;});
			}
		}
	}
	    
	flocker.momentum=vector.prototype.vectorFromPolarDegrees(Math.random()*config.MAX_SPEED,Math.random()*360, (Math.random()*180)-90);

	flockers.push(flocker);
	trackingTree.addItem(flocker);
	
    };
	
    var sumVectors=function(a,b){return a.addToVector(b)};

    var getNewMomentum=function(el,index,ar)
    {
	var treeMates=trackingTree.getProximateList({x:el.getPos().x,y:el.getPos().y,z:el.getPos().z,range:config.NEIGHBOR_DISTANCE});
	var myMates=treeMates.filter(function(a){return el.name!=a.name;});
	el.neighbors=[];
	if (myMates.length>0)
	    {
		el.neighbors=myMates.map(function(a){return {x:a.getPos().x, y:a.getPos().y, z:a.getPos().z, mate:a}});
	//I like to move towards the center of myMates
		var matesPositions=myMates.map(function(a){return new vector(a.getPos().x,a.getPos().y,a.getPos().z)});
		var centerOfMates=matesPositions.reduce(sumVectors).divideByScalar(myMates.length);

		var centralMomentum=new vector(centerOfMates.X-el.getPos().x,
					       centerOfMates.Y-el.getPos().y,
					       centerOfMates.Z-el.getPos().z);

		centralMomentum=centralMomentum.multiplyByScalar(config.CENTRAL_ATTRACTION);

		var matesMomentum=myMates.map(function(a){return a.momentum;}).reduce(sumVectors).divideByScalar(myMates.length);

		matesMomentum=matesMomentum.multiplyByScalar(config.GROUP_DIR_ATTRACTION);

	//I like to keep a certain distance from myMates
		var matesRepel=myMates.map(function(a){
				      var repulsion;
				      var repulsionScalar;
				      var vectToMate=new vector(a.getPos().x-el.getPos().x,
								a.getPos().y-el.getPos().y,
								a.getPos().z-el.getPos().z);
				      repulsion=vectToMate.multiplyByScalar(-1); 
				      if (repulsion.getMagnitude()==0)
					  {
					      repulsion=vector.prototype.vectorFromPolarDegrees(config.MAX_SPEED,Math.random()*360,(Math.random()*180)-90);
					  }
				      else
					  {
					      repulsion=repulsion.multiplyByScalar(((config.NEIGHBOR_DISTANCE-repulsion.getMagnitude())/config.NEIGHBOR_DISTANCE)*config.MAX_SPEED);
					  }
				      return repulsion;
				  })
	                      .reduce(sumVectors)
                              .divideByScalar(myMates.length);

		matesRepel=matesRepel.multiplyByScalar(config.REPULSION_FACTOR);

		var mMoment=el.momentum;


		el.newMomentum=mMoment.addToVector(centralMomentum);
		el.newMomentum=el.newMomentum.addToVector(matesMomentum).addToVector(matesRepel);
	    }
	else
	    {
		el.newMomentum=el.momentum;
	    }
	
	if (el.getPos().x < config.EDGE_DISTANCE)
	    {
		el.newMomentum.X=config.MAX_SPEED;
	    }
	if (el.getPos().y < config.EDGE_DISTANCE)
	    {
		el.newMomentum.Y=config.MAX_SPEED;
	    }
	if (el.getPos().z < config.EDGE_DISTANCE)
	    {
		el.newMomentum.Z=config.MAX_SPEED;
	    }
	if (el.getPos().x > CANVAS_WIDTH-config.EDGE_DISTANCE)
	    {
		el.newMomentum.X=-config.MAX_SPEED;
	    }
	if (el.getPos().y > CANVAS_HEIGHT-config.EDGE_DISTANCE)
	    {
		el.newMomentum.Y=-config.MAX_SPEED;
	    }
	if (el.getPos().z > MODEL_DEPTH-config.EDGE_DISTANCE)
	    {
		el.newMomentum.Z=-config.MAX_SPEED;
	    }

	if (el.newMomentum.getMagnitude()>config.MAX_SPEED)
	    {
		el.newMomentum=el.newMomentum.multiplyByScalar(config.MAX_SPEED/el.newMomentum.getMagnitude());
	    }
    };

    var doMovement=function(el)
    {
	var vectorCompress=[];
	if (config.SMOOTHING_FACTOR>1)
	    {
		vectorCompress.push(el.momentum.multiplyByScalar(config.SMOOTHING_FACTOR-1));
		vectorCompress.push(el.newMomentum);
		el.momentum=vectorCompress.reduce(sumVectors).divideByScalar(config.SMOOTHING_FACTOR);
	    }
	else
	    {
		el.momentum=el.newMomentum;
	    }
	try
	    {
		el.movePos(el.getPos().x+el.momentum.X,
			   el.getPos().y+el.momentum.Y,
			   el.getPos().z+el.momentum.Z);
	    }
	catch(e){}
    };

    var drawnBirdWidth=0;
    var drawnBirdHeight=0;

    var doDraw=function(el)
    {
	cGC.fillStyle=el.color; //'rgb(255,255,255)';
	cGC.strokeStyle='rgb(0,0,255)';
	cGC.lineWidth=1;
	var X=el.getPos().x,Y=el.getPos().y, Z=el.getPos().z;
	var bSize=(MODEL_DEPTH-Z)/(MODEL_DEPTH);
	drawnBirdWidth=bSize*30;
	drawnBirdHeight=bSize*30;
	/*
	cGC.fillRect(X-(Math.floor(drawnBirdWidth/2)),
		     Y-(Math.floor(drawnBirdHeight/2)),
		     drawnBirdWidth,
		     drawnBirdHeight);
	*/
	cGC.beginPath();
	cGC.arc(X,Y,drawnBirdWidth,0,Math.PI*2,true);
	cGC.fill();
	cGC.closePath();
	if (el.neighbors)
	    {
		cGC.beginPath();
		el.neighbors.forEach(function(neighbor){
			cGC.moveTo(X,Y);
			cGC.lineTo(neighbor.x,neighbor.y);
		    });
	   	cGC.stroke();
	    }
    }
    
    var doErase=function(el)
    {
	cGC.strokeStyle='rgb(0,0,0)';
	cGC.lineWidth=1+config.ERASE_INSURANCE;
	var X=el.getPos().x,Y=el.getPos().y, Z=el.getPos().z;
	var bSize=(MODEL_DEPTH-Z)/(MODEL_DEPTH);
	drawnBirdWidth=bSize*30;
	drawnBirdHeight=bSize*30;
	/*
	cGC.clearRect(X-(Math.floor(drawnBirdWidth/2)+config.ERASE_INSURANCE),
                     Y-(Math.floor(drawnBirdHeight/2)+config.ERASE_INSURANCE),
                     drawnBirdWidth+(2*config.ERASE_INSURANCE),
                     drawnBirdHeight+(2*config.ERASE_INSURANCE));
	*/
	cGC.beginPath();
	cGC.fillStyle="black";
	cGC.arc(X,Y,drawnBirdWidth+config.ERASE_INSURANCE,0,Math.PI*2,true);
	cGC.fill();
	cGC.closePath();
	if (el.neighbors)
	    {
		cGC.beginPath();
		el.neighbors.forEach(function(neighbor){
			cGC.moveTo(X,Y);
			cGC.lineTo(neighbor.x,neighbor.y);
		    });
	   	cGC.stroke();
	    }
    }

    var doColor=function(el)
    {
	el.forwardColor(el);
    }
    

    var moveLoop=function(){
	var timer=new Stopwatch();
	timer.start();
	flockers.forEach(doErase);
	if (mustKill)
	    {
		mustKill=false;

		flockers.slice(0,Math.round(flockers.length/10)).forEach(function(thisFlocker){
			trackingTree.destroyItem(thisFlocker);
		    });
		window.flockers=flockers=flockers.slice(Math.round(flockers.length/10));
	    }
	flockers.forEach(getNewMomentum);
	flockers.forEach(doMovement);
	flockers.forEach(doColor);
	//	cGC.clearRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
	flockers.forEach(doDraw);
	timer.stop();
	if (timer.getMillis()<config.MIN_LAG_MS)
	    {
		makeAFlocker();
	    }
	if (timer.getMillis()>config.MAX_LAG_MS && flockers.length > 0)
	    {
		mustKill=true;
	    }
    };

    $(document).ready(function(){
	    canvas=$("#cCanvas");

	    cGC=canvas[0].getContext('2d');

	    CANVAS_WIDTH=canvas[0].width;
	    CANVAS_HEIGHT=canvas[0].height;
	    currentCameraCoords={xrange:CANVAS_WIDTH,yrange:CANVAS_HEIGHT,topleft:new vector(0,0)};


	    trackingTree=new cubeTree(0,0,0,CANVAS_WIDTH,CANVAS_HEIGHT,MODEL_DEPTH,4);
	    window.trackingTree=trackingTree;
	    window.flockers=flockers;

	    for (n=0;n<FLOCK_POPULATION;n++)
		{
		    makeAFlocker();
		}

	    //moveLoop();
	    	    setInterval(moveLoop,50);
	    
	});

    return config;
    
});
/*
CENTRAL_ATTRACTION: 1
EDGE_DISTANCE: 119
GROUP_DIR_ATTRACTION: 1
MAX_LAG_MS: 35
MAX_SPEED: 20
MIN_LAG_MS: 25
NEIGHBOR_DISTANCE: 137
REPULSION_FACTOR: 3
SMOOTHING_FACTOR: 5
*/