import { toDegrees } from "./utils";

import type { StructuredTypeDescriptor } from "@2702rebels/wpidata/abstractions";
import type { ChassisSpeedsStruct, Rotation2dStruct, SwerveModuleStateStruct } from "@2702rebels/wpidata/types/struct";

/** Swerve telemetry, all angular values are in degrees. */
export type SwerveTelemetry = Partial<{
  /** Robot pose rotation in degrees */
  rotation: number;
  /** Measured module states */
  currentStates: Array<{ angle: number; speed: number }>;
  /** Desired module states */
  desiredStates: Array<{ angle: number; speed: number }>;
  /** Measured chassis speed */
  currentSpeeds: { angle: number; speed: number; omega: number };
  /** Desired chassis speed */
  desiredSpeeds: { angle: number; speed: number; omega: number };
}>;

interface SwerveTelemetryStruct {
  readonly rotation: Rotation2dStruct;
  readonly currentStates: Array<SwerveModuleStateStruct>;
  readonly desiredStates: Array<SwerveModuleStateStruct>;
  readonly currentSpeeds: ChassisSpeedsStruct;
  readonly desiredSpeeds: ChassisSpeedsStruct;
}

function parseSwerveModuleStateStruct(value: unknown, normalizeSpeed: (v: number) => number) {
  const { speed, angle } = value as SwerveModuleStateStruct;
  return {
    speed: normalizeSpeed(speed),
    angle: toDegrees(angle.value),
  } as const;
}

function parseChassisSpeed(
  value: unknown,
  normalizeLinearSpeed: (v: number) => number,
  normalizeAngularSpeed: (v: number) => number
) {
  const { vx, vy, omega } = value as ChassisSpeedsStruct;
  const v = Math.hypot(vx, vy);
  const a = Math.atan2(vy, vx);

  return {
    speed: normalizeLinearSpeed(v),
    angle: toDegrees(a),
    omega: normalizeAngularSpeed(toDegrees(omega)),
  } as const;
}

/** Constructs {@link SwerveTelemetry} from the raw value. */
export function toSwerveTelemetry(
  value: unknown,
  structuredType: StructuredTypeDescriptor,
  normalizeLinearSpeed: (v: number) => number,
  normalizeAngularSpeed: (v: number) => number
): SwerveTelemetry | undefined {
  if (value == null) {
    return undefined;
  }

  // current states only
  if (structuredType.format === "struct" && structuredType.name === "SwerveModuleState" && structuredType.isArray) {
    const v = value as Array<SwerveModuleStateStruct>;
    return {
      rotation: 0,
      currentStates: v.map((_) => parseSwerveModuleStateStruct(_, normalizeLinearSpeed)),
      desiredStates: undefined,
      currentSpeeds: undefined,
      desiredSpeeds: undefined,
    };
  }

  if (structuredType.format === "struct" && structuredType.name === "SwerveTelemetry") {
    const v = value as SwerveTelemetryStruct;
    return {
      rotation: toDegrees(v.rotation.value),
      currentStates: v.currentStates.map((_) => parseSwerveModuleStateStruct(_, normalizeLinearSpeed)),
      desiredStates: v.desiredStates.map((_) => parseSwerveModuleStateStruct(_, normalizeLinearSpeed)),
      currentSpeeds: parseChassisSpeed(v.currentSpeeds, normalizeLinearSpeed, normalizeAngularSpeed),
      desiredSpeeds: parseChassisSpeed(v.desiredSpeeds, normalizeLinearSpeed, normalizeAngularSpeed),
    };
  }

  return undefined;
}
