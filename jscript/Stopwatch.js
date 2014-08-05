define([],function(){
    var Stopwatch=function()
    {
	var startTime;
	var stopTime;
	this.start=function()
	{
	    var dt=new Date();
	    startTime=dt.getTime();
	};
	this.stop=function()
	{
	    var dt=new Date();
	    stopTime=dt.getTime();
	    this.getMillis=function(){return stopTime-startTime;}
	}
	this.getMillis=function()
	{
	    var dt=new Date();
	    return dt.getTime()-startTime;
	}
    }

    return Stopwatch;
    });
