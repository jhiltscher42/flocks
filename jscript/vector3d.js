define([],function(){

	function vector(nX,nY,nZ)
{
    if ("undefined"==typeof nZ) nZ=0;
    if (typeof nX=="object" && "x" in nX)
	{
	    this.X=nX.x;
	    this.Y=nX.y;
	    this.Z=nX.z;
	}
    else
	{
	    this.X=nX;
	    this.Y=nY;
	    this.Z=nZ;
	}
};

vector.prototype.vectorFromPolar=function(distance, polar, azimuth)
{
    if ("undefined"==typeof(azimuth)) azimuth=0;
    var x= distance * Math.sin(polar) * Math.cos(azimuth);
    var y= distance * Math.cos(polar) * Math.cos(azimuth);
    var z= distance * Math.sin(azimuth);
    return new vector(x,-y,z);
};

vector.prototype.vectorFromPolarDegrees=function(distance, polar, azimuth)
{
    if ("undefined"==typeof(azimuth)) azimuth=0;
    return vector.prototype.vectorFromPolar(distance,Math.PI*(polar/180),Math.PI*(azimuth/180));
};

vector.prototype.divideByScalar=function(nScalar)
{
    return new vector(this.X/nScalar,this.Y/nScalar,this.Z/nScalar);
};
    
vector.prototype.addToVector=function(sVector){
    return new vector(this.X+sVector.X,this.Y+sVector.Y,this.Z+sVector.Z);
};

vector.prototype.subtractFromVector=function(sVector){
    return new vector(this.X-sVector.X,this.Y-sVector.Y,this.Z-sVector.Z);
};

vector.prototype.toString=function()
{
    return "{"+Math.round(this.X*1000)/1000+","+Math.round(this.Y*1000)/1000+","+Math.round(this.Z*1000)/1000+"}";
}

vector.prototype.rightAngle=function()
{
    //Not sure about this.
    // let's see: 5,0 would be 0,5 -- was east, now is north
    // -5,0 would be 0,-5 -- was west, now is south
    // that's just x'=y y'=x
    // 0,5 would be -5,0 -- was north, now is west
    // 0,-5 would be 5,0 -- was south, now is east
    // ahh, so now it seems we need x'=-y; y'=x;
    // how about...
    // 5,5 (northeast), would be -5,5 (northwest) x'=-y; y'=x;
    // -5,5 (northwest), would be -5,-5 (southwest) x'=-y; y'=x;
    // -5,-5 (southwest), would be 5,-5 (southeast) x'=-y; y'=x;
    // 5,-5 (southeast), would be 5,5 (northeast) x'=-y; y'=x;
    // ok, we still have x'=-y; y'=x;  most general case?
    // 1,5 (northeastish), would be -5,1 (northishwest) x'=-y; y'=x;
    // yup, that seems to do it!
    return new vector(this.Y,-this.X,this.Z);  //doesn't make as much sense with a 3d vector... may want to come back here
    //rightAngle is a specialized extra-fast optimization of a 90 degree rotate to the counter-clockwise pivoting around the z-axis
};

vector.prototype.multiplyByScalar=function(nScalar)
{
    return new vector(this.X*nScalar,this.Y*nScalar,this.Z*nScalar);
};

vector.prototype.normalized=function(){
    if (!this.X && !this.Y && !this.Z) return new vector(1,0,0);
    return this.divideByScalar(this.getMagnitude());
}

vector.prototype.getMagnitude=function()
{
    return Math.sqrt(this.getMagSquared());
};

vector.prototype.getMagSquared=function()
{
    return this.X*this.X + this.Y*this.Y + this.Z*this.Z;
}

//there's *2* relevant angles to any 3 dimensional vector.  The first is the polar angle on the projected X-Y plane (like latitude)
//the second is the azimuth
vector.prototype.getAngle=function()
{
    //perhaps untraditionally, this causes 'north' to be 0, 'east' to be 90, 'south' to be 180 and 'west' to be 270
    //the angle is the arctan of the slope, which is the rise over the run.  obviously, if the run (the X component) is 0, then the slope is undefined, but then the angle is either 0 or 180
    if (!this.X)
	{
	    if (this.Y<=0) return 0;
	    else return 180;
	}
    var slope=-this.Y/this.X;
    var angle=90-Math.atan(slope)/Math.PI*180;
    if (this.X < 0) angle+=180;
    return angle;
};

vector.prototype.getAzimuth=function(){
    var R=this.getMagnitude();
    if (!R) return 0;
    return Math.asin(this.Z/R)/Math.PI*180;
}

vector.prototype.cross=function(sVector){
    return new vector(this.Y*sVector.Z-this.Z*sVector.Y,
		      this.Z*sVector.X-this.X*sVector.Z,
		      this.X*sVector.Y-this.Y*sVector.X);
}

vector.prototype.dot=function(sVector){
    return this.X*sVector.X + this.Y*sVector.Y + this.Z*sVector.Z;
}

vector.prototype.reflect=function(sVector){
    return this.subtractFromVector(sVector.multiplyByScalar(2).multiplyByScalar(this.dot(sVector)));
}

vector.prototype.rotate=function(degrees, axis_vector)
{
    if (!axis_vector) axis_vector=new vector(0,0,1);  
    //we want rotate(degrees) to work like its 2d counterpart, so the 
    //default axis is the z-axis

    //referencing http://inside.mines.edu/~gmurray/ArbitraryAxisRotation/ArbitraryAxisRotation.html
    
    //rotating point x,y,z around the line through a,b,c in direction u,v,w by the angle D is

    //L = u^2 + v^2 + w^2
    //f(x,y,z,a,b,c,u,v,w,D) = 
    //x'=((a(v^2+w^2) - u(bv+cw-ux-vy-wz)) * (1-cos(D)) + (L*x*cos(D)) + sqrt(L*(-cv+bw-wy+vz)*sin(D)))/L
    //making a,b,c the origin point simplifies to:
    //f(x,y,z,u,v,w,D)
    //x'=((-u * (-ux-vy-wz)) * (1-cos(D)) + (L*x*cos(D)) + sqrt(L) * sin(D) * (-wy+vz) )/L
    //y'=((-v * (-ux-vy-wz)) * (1-cos(D)) + (L*y*cos(D)) + sqrt(L) * sin(D) * (+wx-uz) )/L
    //z'=((-w * (-ux-vy-wz)) * (1-cos(D)) + (L*z*cos(D)) + sqrt(L) * sin(D) * (-vx+uy) )/L

    var L=axis_vector.X*axis_vector.X+
          axis_vector.Y*axis_vector.Y+
          axis_vector.Z*axis_vector.Z;

    var radians=Math.PI*(degrees/180);

    var second_term=(-(axis_vector.X*this.X)-(axis_vector.Y*this.Y)-(axis_vector.Z*this.Z));
    
    var third_term=1-Math.cos(radians);
    
    var fourth_term=L*Math.cos(radians);
    
    var sine_term=Math.sqrt(L)*Math.sin(radians);

    var rotateF=function(pointPart,axisPart,point_other,axis_other,point_two,axis_two){

	return (((-axisPart*second_term)*third_term) + 
		pointPart*fourth_term + 
				 sine_term * ((axis_other*point_other)+(axis_two*point_two)) )/L;
    };

    var x=rotateF(this.X,axis_vector.X, this.Y,-axis_vector.Z, this.Z, axis_vector.Y);
    var y=rotateF(this.Y,axis_vector.Y, this.X, axis_vector.Z, this.Z,-axis_vector.X);
    var z=rotateF(this.Z,axis_vector.Z, this.X,-axis_vector.Y, this.Y, axis_vector.X);

    return new vector(x,y,z);
}

return vector;
});
