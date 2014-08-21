define(["vector3d","cubeTree","cubeItem","Stopwatch","Three","jQuery"],function(vector,cubeTree,cubeItem,Stopwatch,Three,$){
	var CANVAS_WIDTH, CANVAS_HEIGHT, MODEL_DEPTH=2000,
	FLOCK_POPULATION=100,
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
		DRAW_LINES:false
    };
    
    if (!console) console={};
    if (!console.log) console.log=function(){}
    

    var canvas,cGC;

	var threeSCENE,threeCAMERA,threeRenderer;
	
    var canvasOffset={left:0,top:0};
    var currentCameraCoords;

	var quaternionOfHeading=new THREE.Quaternion();
	var eulerRotator=new THREE.Euler();
	
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
			
		flocker.momentum=vector.prototype.vectorFromPolarDegrees(Math.random()*config.MAX_SPEED,Math.random()*360, (Math.random()*180)-90);

		flockers.push(flocker);
		trackingTree.addItem(flocker);
	
    };
	
    var sumVectors=function(a,b){return a.addToVector(b)};

    var getNewMomentum=function(el,index,ar)
    {
	//treeMates are all flockers within NEIGHBOR_DISTANCE of el
	var treeMates=trackingTree.getProximateList(
		{x:el.getPos().x,y:el.getPos().y,z:el.getPos().z,
		range:config.NEIGHBOR_DISTANCE});
	//myMates are all treeMates except el
	var myMates=treeMates.filter(function(a){return el.name!=a.name;});
	//el.neighbors is the old list of neighbors, with a threeJS line reference posibly attached.
	//this seems like an expensive way to do this
	if (el.neighbors){
		el.neighbors.forEach(function(neighbor){
			//remove neighbor line from scene
			if (neighbor.threeLINE){
				threeSCENE.remove(neighbor.threeLINE);
			}
		});
	}
	//clear neighbors list
	el.neighbors=[];
	if (myMates.length>0)
	    {
		el.neighbors=myMates.map(function(a){
			var ret={x:a.getPos().x, 
					y:a.getPos().y, 
					z:a.getPos().z, 
					mate:a};
			//add line to neighbor to scene
			if ("DRAW_LINES" in config && config.DRAW_LINES==true)
			{
				var geometry=new THREE.Geometry();
				geometry.vertices.push(new THREE.Vector3(el.getPos().x,el.getPos().y,el.getPos().z),
					      new THREE.Vector3(ret.x,ret.y,ret.z));
				ret.threeLINE=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:0x00FF00}));
				threeSCENE.add(ret.threeLINE);
			}
			return ret;
		});
	//I like to move towards the center of myMates
		var matesPositions=myMates.map(function(a){return new vector(a.getPos().x,a.getPos().y,a.getPos().z)});
		//sumVectors returns a vector type, which has a divideByScalar method
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


	var doDraw=function(el){
		//oh.  in THREE, we don't keep creating objects, that's Bad.  Ah.
		if (!("threeMODEL" in el)){
			//el.threeMODEL=new THREE.Mesh(new THREE.BoxGeometry(20,20,20),new THREE.MeshLambertMaterial({color:el.color}));
			var spikyGeometry=new Three.Geometry();
			var vertices=null; //el.neighbors.map(neighborToSpike);
			
			if (!vertices || vertices.length==0){
				if (!vertices) vertices=[];
				vertices[0]=new Three.Vector3(0,0,-10);
				vertices[1]=new Three.Vector3(0,-5,10);
				vertices[2]=new Three.Vector3(20,0,10);
				vertices[3]=new Three.Vector3(0,5,10);
				vertices[4]=new Three.Vector3(-20,0,10);
			}

			function colorToMaterial(color){
				return new THREE.MeshBasicMaterial({color:color
				,side:THREE.DoubleSide
				});
				}
			
			var materials=[0x333333,0xFFFFFF,0xFFFFFF,0x333333,0xFF0000,0xFF0000].map(colorToMaterial);
			spikyGeometry.vertices=vertices;
			
			var backNormal=new Three.Vector3(0,0,1);
			
			spikyGeometry.faces.push(new Three.Face3(0,2,1,undefined,undefined,0));
			spikyGeometry.faces.push(new Three.Face3(0,2,3,undefined,undefined,1));
			spikyGeometry.faces.push(new Three.Face3(0,3,4,undefined,undefined,2));
			spikyGeometry.faces.push(new Three.Face3(0,4,1,undefined,undefined,3));
			spikyGeometry.faces.push(new Three.Face3(1,3,4,backNormal,undefined,4));
			spikyGeometry.faces.push(new Three.Face3(1,3,2,backNormal,undefined,5));
			
			//spikyGeometry.faces.forEach(function(face,index){face.materialIndex=index;});
			
			spikyGeometry.computeFaceNormals();
			
			el.threeMODEL=new Three.Mesh(spikyGeometry,
			//new Three.CubeGeometry(10,10,10),
			new Three.MeshFaceMaterial(materials));
			threeSCENE.add(el.threeMODEL);
		}
		
		var modelPos=el.getPos();
		el.threeMODEL.position.x=modelPos.x;
		el.threeMODEL.position.y=modelPos.y;
		el.threeMODEL.position.z=modelPos.z;
		var heading=new THREE.Vector3(el.momentum.X,el.momentum.Y,el.momentum.Z).normalize();
		quaternionOfHeading.setFromUnitVectors(new THREE.Vector3(0,0,-1),heading);
		eulerRotator.setFromQuaternion(quaternionOfHeading);
		el.threeMODEL.rotation.x=eulerRotator.x;
		el.threeMODEL.rotation.y=eulerRotator.y;
		el.threeMODEL.rotation.z=eulerRotator.z;
		
	}
	
	var doErase=function(el){
	}
	
 
    var moveLoop=function(){

		flockers.forEach(getNewMomentum);
		flockers.forEach(doMovement);
		flockers.forEach(doDraw);
	
		threeRenderer.render(threeSCENE,threeCAMERA);
	
    };

	function makeRenderer(canvas){
		return new THREE.WebGLRenderer({canvas:canvas[0]});
		}
	
    $(document).ready(function(){
	    canvas=$("#cCanvas");
		
	    CANVAS_WIDTH=canvas[0].width;
	    CANVAS_HEIGHT=canvas[0].height;

		
	    //cGC=canvas[0].getContext('2d');

		
		threeSCENE=new Three.Scene();
		
		threeSCENE.add(new Three.AmbientLight(0xFFFFFF));
		//threeSCENE.fog=new Three.Fog(0x000000,-MODEL_DEPTH,MODEL_DEPTH);
		
		threeCAMERA=new Three.OrthographicCamera(0,CANVAS_WIDTH,0,CANVAS_HEIGHT,-MODEL_DEPTH,MODEL_DEPTH);
		
		window.camera=threeCAMERA;
		
		threeRenderer=makeRenderer(canvas);

		threeRenderer.setClearColor(0x000000);

		threeRenderer.render(threeSCENE,threeCAMERA);
		
	    trackingTree=new cubeTree(0,0,0,CANVAS_WIDTH,CANVAS_HEIGHT,MODEL_DEPTH,4);
		window.scene=threeSCENE;
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
