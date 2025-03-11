import React from 'react';
import { Svg, Rect, Circle, Line, Text, G} from 'react-native-svg';

const BusIcon = ({ 
  width = 40, 
  height = 40, 
  fillColor = 'blue', 
  borderColor = 'black', 
  wheelColor = 'black',
  rotation = 0
}) => (
  <Svg 
    width={width} 
    height={height} 
    viewBox="0 0 40 80" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Group to Apply Rotation */}
    <G transform={`rotate(${rotation}, 20, 40)`}>
      
      {/* Shadow for Elevation Effect */}
      <Rect x="6" y="6" width="28" height="68" rx="6" ry="6" fill="rgba(0, 0, 0, 0.7)" />

      {/* Bus Body with Black Border */}
      <Rect x="5" y="5" width="30" height="70" rx="6" ry="6" fill={fillColor} stroke="black" strokeWidth="2"/>

      {/* Roof Details (Ventilation Panels) with Borders */}
      <Rect x="10" y="15" width="20" height="8" fill="white" stroke="black" strokeWidth="1" opacity="0.8"/>
      <Rect x="10" y="35" width="20" height="8" fill="white" stroke="black" strokeWidth="1" opacity="0.8"/>
      <Rect x="10" y="55" width="20" height="8" fill="white" stroke="black" strokeWidth="1" opacity="0.8"/>

      {/* Front and Rear Lights */}
      <Circle cx="15" cy="7" r="3" fill="yellow" stroke="black" strokeWidth="1"/>
      <Circle cx="25" cy="7" r="3" fill="yellow" stroke="black" strokeWidth="1"/>
    </G>
  </Svg>
);

export default BusIcon;
