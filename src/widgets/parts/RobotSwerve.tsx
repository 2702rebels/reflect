const MODULE_TRANSLATION = ["8 1", "83 1", "8 76", "83 76"];
const MAX_ARROW_LENGTH = 32;
const MIN_SPEED_THRESHOLD = 0.01;
const MIN_OMEGA_THRESHOLD = 1;
const WHEEL_H = 23;
const WHEEL_W = 9;
const WHEEL_MID = `${WHEEL_W / 2} ${WHEEL_H / 2}`;
const ARROW_FWD = `${WHEEL_W / 2} 0`;
const ARROW_REV = `${WHEEL_W / 2} ${WHEEL_H}`;

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(radians),
    y: cy + r * Math.sin(radians),
  };
}

const Arrow = ({ length, ...props }: React.SVGAttributes<SVGPathElement> & { length: number }) => (
  <path
    d={`M 0 0 l 0 -${length} l -3 2.5 M 0 -${length} l 3 2.5`}
    strokeLinecap="round"
    strokeLinejoin="round"
    fill="none"
    {...props}
  />
);

const Arc = ({
  angle,
  radius = 25,
  ...props
}: React.SVGAttributes<SVGGElement> & { angle: number; radius?: number }) => {
  const { x, y } = polarToCartesian(0, 0, radius, angle);
  return (
    <g
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      {...props}>
      <path
        d={`M 0 -${radius} A ${radius} ${radius} 0 ${Math.abs(angle) > 180 ? 1 : 0} ${angle < 0 ? 0 : 1} ${x} ${y}`}
      />
      <path
        d={
          angle < 0
            ? `M 0 -${radius} l 2.5 -3 M 0 -${radius} l 2.5 3`
            : `M 0 -${radius} l -2.5 -3 M 0 -${radius} l -2.5 3`
        }
        transform={`rotate(${angle})`}
      />
    </g>
  );
};

const WheelSpeedVector = ({ value, ...props }: React.SVGAttributes<SVGPathElement> & { value: number }) => (
  <Arrow
    transform={value < 0 ? `translate(${ARROW_REV}) rotate(-180)` : `translate(${ARROW_FWD})`}
    length={MAX_ARROW_LENGTH * Math.abs(value)}
    strokeWidth={1.5}
    {...props}
  />
);

const ChassisSpeedVector = ({ value, ...props }: React.SVGAttributes<SVGPathElement> & { value: number }) => (
  <Arrow
    transform={value < 0 ? `rotate(-180)` : undefined}
    length={MAX_ARROW_LENGTH * Math.abs(value)}
    strokeWidth={1.5}
    {...props}
  />
);

const Wheel = (props: React.SVGAttributes<SVGGElement>) => (
  <g {...props}>
    <rect
      stroke="current"
      width="7"
      height="21"
      x="1"
      y="1"
      rx="2"
    />
    <path
      stroke="current"
      strokeLinecap="round"
      d="M1 3h7M1 5h7M1 7.5h7M1 10h7M1 13h7M1 15.5h7M1 18h7M1 20h7"
    />
  </g>
);

export type RobotSwerveProps = React.SVGAttributes<SVGSVGElement> & {
  currentStates?: Array<{ speed: number; angle: number }>;
  desiredStates?: Array<{ speed: number; angle: number }>;
  currentSpeeds?: { speed: number; angle: number; omega: number };
  desiredSpeeds?: { speed: number; angle: number; omega: number };
};

export const RobotSwerve = ({
  currentStates,
  desiredStates,
  currentSpeeds,
  desiredSpeeds,
  ...props
}: RobotSwerveProps) =>
  // prettier-ignore
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" {...props}>
    <rect stroke="current" fill="current" width="99" height="99" x=".5" y=".5" rx="12"/>
    <path stroke="current" fill="current" d="M75.477 12.5q-.002.093 0 .2c.008.468.057 1.132.22 1.93.327 1.601 1.109 3.741 2.917 5.937 1.842 2.237 4.206 3.218 6.09 3.64a13 13 0 0 0 2.796.31v50.964q-.161-.001-.363.005a12.232 12.232 0 0 0-8.502 3.923 11.7 11.7 0 0 0-2.938 5.776 11.7 11.7 0 0 0-.22 2.315H24.523v-.27a11.7 11.7 0 0 0-.22-2.045 11.7 11.7 0 0 0-2.938-5.776 12.23 12.23 0 0 0-8.865-3.928V24.518q.188.002.432-.006c.594-.02 1.423-.094 2.365-.305 1.883-.422 4.247-1.403 6.089-3.64 1.808-2.196 2.59-4.336 2.917-5.936.163-.8.212-1.463.22-1.93q.002-.108 0-.201z"/>
    <path stroke="current" fill="none" d="M1 50h11M88 50h11M50 1v11M50 88v11" strokeLinecap="round"/>
    <path stroke="current" fill="none" d="m51.732 32 14.74 25.531c1.101 1.906-1.235 3.933-2.967 2.573l-12.27-9.634a2 2 0 0 0-2.47 0l-12.27 9.634c-1.731 1.36-4.068-.667-2.968-2.573L48.268 32m3.464 0c-.77-1.333-2.694-1.333-3.464 0m3.464 0c-.77-1.333-2.694-1.333-3.464 0"/>
    <circle fill="current" stroke="current" cx="12.5" cy="12.5" r="12"/>
    <circle fill="current" stroke="current" cx="87.5" cy="12.5" r="12"/>
    <circle fill="current" stroke="current" cx="12.5" cy="87.5" r="12"/>
    <circle fill="current" stroke="current" cx="87.5" cy="87.5" r="12"/>
    {MODULE_TRANSLATION.map((translation, index) => {
      const currentState = currentStates?.[index];
      const currentSpeed = currentState?.speed;
      const currentAngle = currentState?.angle ?? 0;

      const desiredState = desiredStates?.[index];
      const desiredSpeed = desiredState?.speed;
      const desiredAngle = desiredState?.angle ?? 0;

      return (
        <g key={`_${index}`} transform={`translate(${translation})`}>
          {desiredSpeed != null && Math.abs(desiredSpeed) >= MIN_SPEED_THRESHOLD && (
            <g transform={`rotate(${-desiredAngle} ${WHEEL_MID})`}>
              <WheelSpeedVector value={desiredSpeed} className="stroke-sky-600" />
            </g>
          )}
          <g transform={`rotate(${-currentAngle} ${WHEEL_MID})`}>
            <Wheel />
            {currentSpeed != null && Math.abs(currentSpeed) >= MIN_SPEED_THRESHOLD && (
              <WheelSpeedVector value={currentSpeed} className="stroke-red-600" />
            )}
          </g>
        </g>
      );
    })}
    <g transform="translate(50 50)">
      {desiredSpeeds != null && (
        <>
          {Math.abs(desiredSpeeds.speed) >= MIN_SPEED_THRESHOLD && (
            <g transform={`rotate(${-desiredSpeeds.angle} 0 0)`}>
              <ChassisSpeedVector value={desiredSpeeds.speed} className="stroke-sky-600" />
            </g>
          )}
          {Math.abs(desiredSpeeds.omega) >= MIN_OMEGA_THRESHOLD && (
            <Arc angle={-desiredSpeeds.omega} className="stroke-sky-600" />
          )}
        </>
      )}
      {currentSpeeds != null && (
        <>
          {Math.abs(currentSpeeds.speed) >= MIN_SPEED_THRESHOLD && (
            <g transform={`rotate(${-currentSpeeds.angle} 0 0)`}>
              <ChassisSpeedVector value={currentSpeeds.speed} className="stroke-green-600" />
            </g>
          )}
          {Math.abs(currentSpeeds.omega) >= MIN_OMEGA_THRESHOLD && (
            <Arc angle={-currentSpeeds.omega} className="stroke-green-600" />
          )}
        </>
      )}
    </g>
  </svg>;
