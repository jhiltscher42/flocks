define(["jQuery"],function($){
 var fadeMinimizer=function(fromIntensity,toIntensity,duration,start_time){
   //draw the minizer at full
   if (start_time===undefined)
     {
       start_time=new Date();
     }
   //for now, we just skip to the end.
   var canvasOb=$("#minimizer canvas");
   var shape=canvasOb.data("shape");
   if (!shape) return;
   
   canvasOb=canvasOb[0];

   canvasOb.getContext('2d').fillStyle="rgba(200,200,200,"+toIntensity+")";
   //   canvasOb.getContext('2d').globalAlpha=toIntensity;
   shape(canvasOb);
 };
   

var fadeOut=function(){
  console.log("fade out");
  fadeMinimizer(1,.5,1000);
};
  
var minimizerHandler=function(){
  console.log("fade in");
  fadeMinimizer(.5,1,1000);
};
    
var triangle=[{x:90,y:10},
	      {x:10,y:50},
	      {x:90,y:90}];

function drawOb(canvasOb, coordArray, transformArray)
{
  if (!canvasOb) return;
  
  canvasOb.clearRect(0,0,100,100);
  //  canvasOb.fillStyle="rgb(200,200,200)";
  canvasOb.strokeStyle="rgb(0,0,0)";
  
  if (transformArray)
    {
      canvasOb.setTransform(transformArray[0],
			    transformArray[1],
			    transformArray[2],
			    transformArray[3],
			    transformArray[4],
			    transformArray[5]);
    }
  
  canvasOb.beginPath();
  canvasOb.moveTo(coordArray[0].x,coordArray[0].y);
  
  for (var cIndex=0;cIndex<coordArray.length;cIndex++)
    {
      canvasOb.lineTo(coordArray[cIndex].x,coordArray[cIndex].y);
    }
  
  canvasOb.closePath();
  canvasOb.fill();
  canvasOb.stroke();
};

function drawRightArrow(canvasOb)
{
  if (canvasOb.length)
    {
      canvasOb.data("shape",drawRightArrow);
      canvasOb=canvasOb[0];  //pull it out of jQuery object;
    }
  if (canvasOb) canvasOb=canvasOb.getContext('2d');  //pull the graphics context out of that
  if (canvasOb)
    {
      drawOb(canvasOb,triangle, [-1,0,0,1,100,0]);
    }
}

function drawLeftArrow(canvasOb)
{
  if (canvasOb.length)
    {
      canvasOb.data("shape",drawLeftArrow);
      canvasOb=canvasOb[0];  //pull it out of jQuery object;
    }
  if (canvasOb) canvasOb=canvasOb.getContext('2d');  //pull the graphics context out of that
  if (canvasOb)
    {
      drawOb(canvasOb,triangle, [1,0,0,1,0,0]);
    }
}

function toggle_pane(pane_id)
{
  panel=$("#"+pane_id);
  if (panel.length)
    {
      switch ($(this).data("showstate"))
	{
  
	case "show":
	  drawRightArrow($("#minimizer canvas"));
	  $(this).data("showstate","hide");
	  //panel.show();
	  panel.css("z-index",20);
	  break;
	default:
	  drawLeftArrow($("#minimizer canvas"));
	  $(this).data("showstate","show");
	  //panel.hide();
	  panel.css("z-index",-20);
	  break;
	}
    }
}

$(document).ready(function(){
	$("#minimizer canvas").width(10).height(30);
	$("#minimizer").on('mouseout',fadeOut)
                       .on('mouseover',minimizerHandler)
	    .click(function(){toggle_pane('control_pane');});
	
    });
});
