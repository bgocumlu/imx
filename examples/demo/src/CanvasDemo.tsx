export function CanvasDemo(props: { onClose: () => void }) {
  return (
    <Window title="Canvas Demo" open={true} onClose={props.onClose}>
      <Column gap={8}>
        <Text>All drawing primitives on a single canvas.</Text>
        <Text disabled>Coordinates are relative to the canvas origin (top-left).</Text>

        <Canvas width={400} height={300} style={{ backgroundColor: [0.08, 0.08, 0.1, 1.0] }}>
          {/* Lines */}
          <DrawLine p1={[10, 10]} p2={[100, 10]} color={[1.0, 1.0, 0.0, 1.0]} thickness={2} />
          <DrawLine p1={[10, 20]} p2={[100, 60]} color={[0.8, 0.4, 0.0, 1.0]} thickness={1} />

          {/* Rectangles */}
          <DrawRect min={[10, 70]} max={[90, 120]} color={[0.4, 0.8, 1.0, 1.0]} thickness={2} />
          <DrawRect min={[100, 70]} max={[180, 120]} color={[0.2, 0.6, 0.9, 1.0]} filled={true} rounding={6} />

          {/* Circles */}
          <DrawCircle center={[50, 170]} radius={30} color={[1.0, 0.4, 0.4, 1.0]} thickness={2} />
          <DrawCircle center={[130, 170]} radius={25} color={[0.9, 0.3, 0.3, 1.0]} filled={true} />

          {/* Text */}
          <DrawText pos={[200, 10]} text="Hello Canvas!" color={[1.0, 1.0, 1.0, 1.0]} />

          {/* Bezier Cubic */}
          <DrawBezierCubic
            p1={[200, 50]}
            p2={[240, 20]}
            p3={[280, 80]}
            p4={[320, 50]}
            color={[0.5, 1.0, 0.5, 1.0]}
            thickness={2}
          />

          {/* Bezier Quadratic */}
          <DrawBezierQuadratic
            p1={[200, 90]}
            p2={[260, 60]}
            p3={[320, 90]}
            color={[0.5, 0.8, 1.0, 1.0]}
            thickness={2}
          />

          {/* Polyline */}
          <DrawPolyline
            points={[[200, 130], [230, 110], [260, 150], [290, 120], [320, 140]]}
            color={[1.0, 0.8, 0.2, 1.0]}
            thickness={2}
          />

          {/* Convex poly filled */}
          <DrawConvexPolyFilled
            points={[[210, 170], [250, 155], [280, 175], [265, 205], [220, 205]]}
            color={[0.6, 0.3, 0.9, 0.8]}
          />

          {/* Ngon outlined */}
          <DrawNgon center={[340, 170]} radius={28} color={[0.2, 1.0, 0.6, 1.0]} numSegments={6} thickness={2} />

          {/* Ngon filled */}
          <DrawNgonFilled center={[340, 240]} radius={22} color={[0.2, 0.8, 0.5, 0.7]} numSegments={5} />

          {/* Triangle */}
          <DrawTriangle
            p1={[20, 250]}
            p2={[70, 210]}
            p3={[110, 260]}
            color={[1.0, 0.5, 0.2, 1.0]}
            thickness={2}
          />
        </Canvas>
      </Column>
    </Window>
  );
}
