require(["jQuery","flock","controlpane","jquery-ui"],function($,flockConfig){

   $(document).ready(function(){

     var bindConfig=function(el_id,conf_ob_id,Min,Max)
         {
            var el=$("#"+el_id);
            el.slider({min:Min,
                       max:Max,
                       value:flockConfig[conf_ob_id],
                       change:function(event,ui)
                          {
                             flockConfig[conf_ob_id]=ui.value;
                          }
   
                      });
          };

     var addSlider=function(label,conf_ob_id, Min,Max)
         {
            var newTR=$("<tr><td style='color:white'>"+label+"</td><td width='100'><div class='sliderframe'><div id='"+conf_ob_id+"'></div></div></td></tr>");
            $("#control_table").append(newTR);
            bindConfig(conf_ob_id,conf_ob_id,Min,Max);
         };

   addSlider("Speed","MAX_SPEED",0,100);
   addSlider("Cohesion","CENTRAL_ATTRACTION",0,10);
   addSlider("Conformity","GROUP_DIR_ATTRACTION",0,10);
   addSlider("Elbow Room","REPULSION_FACTOR",0,10);
   addSlider("Smoothing","SMOOTHING_FACTOR",0,10);
   addSlider("Neighbor Distance","NEIGHBOR_DISTANCE",0,300);
   addSlider("Edge Force","EDGE_DISTANCE",0,300);
   addSlider("Bird Width","BIRD_WIDTH",0,40);
   addSlider("Bird Height","BIRD_HEIGHT",0,40);
})

       });
