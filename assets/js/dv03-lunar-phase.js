(() => {
  const DEG=Math.PI/180;
  const RAD=180/Math.PI;
  const DAY_MS=86400000;
  const UNIX_EPOCH_JD=2440587.5;
  const ORBIT_EPOCH_JD=2451543.5;
  const ASSET_BUCKETS=Object.freeze(['NEW','CRESCENT','QUARTER','FULL']);

  const normalizeDegrees=value=>((value%360)+360)%360;
  const sinDegrees=value=>Math.sin(value*DEG);

  function julianDate(value=new Date()){
    const date=value instanceof Date?value:new Date(value);
    if(Number.isNaN(date.getTime()))throw new Error('Invalid lunar phase date');
    return UNIX_EPOCH_JD+date.getTime()/DAY_MS;
  }

  function eccentricAnomaly(meanAnomaly,eccentricity){
    let anomaly=meanAnomaly+RAD*eccentricity*Math.sin(meanAnomaly*DEG)*(1+eccentricity*Math.cos(meanAnomaly*DEG));
    for(let i=0;i<2;i++){
      const radians=anomaly*DEG;
      anomaly-=(anomaly-RAD*eccentricity*Math.sin(radians)-meanAnomaly)/(1-eccentricity*Math.cos(radians));
    }
    return anomaly;
  }

  function solarLongitude(days){
    const perihelion=normalizeDegrees(282.9404+4.70935e-5*days);
    const eccentricity=0.016709-1.151e-9*days;
    const meanAnomaly=normalizeDegrees(356.0470+0.9856002585*days);
    const anomaly=eccentricAnomaly(meanAnomaly,eccentricity)*DEG;
    const x=Math.cos(anomaly)-eccentricity;
    const y=Math.sqrt(1-eccentricity*eccentricity)*Math.sin(anomaly);
    return {
      longitude:normalizeDegrees(Math.atan2(y,x)*RAD+perihelion),
      meanAnomaly,
      meanLongitude:normalizeDegrees(meanAnomaly+perihelion)
    };
  }

  function lunarLongitude(days,sun){
    const ascendingNode=normalizeDegrees(125.1228-0.0529538083*days);
    const inclination=5.1454*DEG;
    const periapsis=normalizeDegrees(318.0634+0.1643573223*days);
    const eccentricity=0.0549;
    const semiMajorAxis=60.2666;
    const meanAnomaly=normalizeDegrees(115.3654+13.0649929509*days);
    const anomaly=eccentricAnomaly(meanAnomaly,eccentricity)*DEG;
    const x=semiMajorAxis*(Math.cos(anomaly)-eccentricity);
    const y=semiMajorAxis*Math.sqrt(1-eccentricity*eccentricity)*Math.sin(anomaly);
    const radius=Math.hypot(x,y);
    const orbitalLongitude=normalizeDegrees(Math.atan2(y,x)*RAD+periapsis);
    const node=ascendingNode*DEG;
    const longitude=orbitalLongitude*DEG;
    const eclipticX=radius*(Math.cos(node)*Math.cos(longitude)-Math.sin(node)*Math.sin(longitude)*Math.cos(inclination));
    const eclipticY=radius*(Math.sin(node)*Math.cos(longitude)+Math.cos(node)*Math.sin(longitude)*Math.cos(inclination));
    let eclipticLongitude=normalizeDegrees(Math.atan2(eclipticY,eclipticX)*RAD);

    const meanLongitude=normalizeDegrees(ascendingNode+periapsis+meanAnomaly);
    const elongation=normalizeDegrees(meanLongitude-sun.meanLongitude);
    const argumentOfLatitude=normalizeDegrees(meanLongitude-ascendingNode);
    eclipticLongitude+=
      -1.274*sinDegrees(meanAnomaly-2*elongation)
      +0.658*sinDegrees(2*elongation)
      -0.186*sinDegrees(sun.meanAnomaly)
      -0.059*sinDegrees(2*meanAnomaly-2*elongation)
      -0.057*sinDegrees(meanAnomaly-2*elongation+sun.meanAnomaly)
      +0.053*sinDegrees(meanAnomaly+2*elongation)
      +0.046*sinDegrees(2*elongation-sun.meanAnomaly)
      +0.041*sinDegrees(meanAnomaly-sun.meanAnomaly)
      -0.035*sinDegrees(elongation)
      -0.031*sinDegrees(meanAnomaly+sun.meanAnomaly)
      -0.015*sinDegrees(2*argumentOfLatitude-2*elongation)
      +0.011*sinDegrees(meanAnomaly-4*elongation);
    return normalizeDegrees(eclipticLongitude);
  }

  function bucketForIllumination(value){
    const illumination=Math.max(0,Math.min(1,Number(value)));
    if(illumination<0.125)return 'NEW';
    if(illumination<0.375)return 'CRESCENT';
    if(illumination<0.75)return 'QUARTER';
    return 'FULL';
  }

  function phaseFor(value=new Date()){
    const date=value instanceof Date?value:new Date(value);
    const days=julianDate(date)-ORBIT_EPOCH_JD;
    const sun=solarLongitude(days);
    const moonLongitude=lunarLongitude(days,sun);
    const elongationDegrees=normalizeDegrees(moonLongitude-sun.longitude);
    const illumination=(1-Math.cos(elongationDegrees*DEG))/2;
    return Object.freeze({
      bucket:bucketForIllumination(illumination),
      illumination,
      elongationDegrees,
      waxing:elongationDegrees<180
    });
  }

  const api=Object.freeze({ASSET_BUCKETS,julianDate,bucketForIllumination,phaseFor});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof window!=='undefined')window.DV03_LUNAR_PHASE=api;
})();