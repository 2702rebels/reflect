import type { DataChannel, StructuredTypeDescriptor } from "@2702rebels/wpidata/abstractions";
import type {
  Pose2dProto,
  Pose3dProto,
  QuaternionProto,
  Rotation2dProto,
  Rotation3dProto,
} from "@2702rebels/wpidata/types/protobuf";
import type { ADIS164xxIMUSendable, Field2dSendable, GyroSendable } from "@2702rebels/wpidata/types/sendable";
import type {
  Pose2dStruct,
  Pose3dStruct,
  QuaternionStruct,
  Rotation2dStruct,
  Rotation3dStruct,
} from "@2702rebels/wpidata/types/struct";
import type { WidgetDescriptorSlot, WidgetPropsWithNumericValue } from "./types";

export interface Quaternion {
  readonly w: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface Pose2d {
  /** X position in meters */
  readonly x: number;
  /** Y position in meters */
  readonly y: number;
  /** Rotation in degrees */
  readonly theta: number;
}

export interface Rotation3d {
  /** CCW rotation angle around X axis (roll) in degrees */
  readonly x: number;
  /** CCW rotation angle around Y axis (pitch) in degrees */
  readonly y: number;
  /** CCW rotation angle around Z axis (yaw) in degrees */
  readonly z: number;
}

// For quaternion algorithms see:
// https://github.com/wpilibsuite/allwpilib/blob/main/wpimath/algorithms.md#quaternion-to-euler-angle-conversion
// https://github.com/wpilibsuite/allwpilib/blob/main/wpimath/src/main/java/edu/wpi/first/math/geometry/Rotation3d.java

/** Returns the ccw rotation angle around the X axis (roll) in radians. */
export function getRoll(q: Quaternion) {
  const cxcy = 1.0 - 2.0 * (q.x * q.x + q.y * q.y);
  const sxcy = 2.0 * (q.w * q.x + q.y * q.z);
  const cy_sq = cxcy * cxcy + sxcy * sxcy;
  if (cy_sq > 1e-20) {
    return Math.atan2(sxcy, cxcy);
  } else {
    return 0.0;
  }
}

/** Returns the ccw rotation angle around the Y axis (pitch) in radians. */
export function getPitch(q: Quaternion) {
  const ratio = 2.0 * (q.w * q.y - q.z * q.x);
  if (Math.abs(ratio) >= 1.0) {
    return Math.sign(ratio) * (Math.PI / 2.0);
  } else {
    return Math.asin(ratio);
  }
}

/** Returns the ccw rotation angle around the Z axis (yaw) in radians. */
export function getYaw(q: Quaternion) {
  const cycz = 1.0 - 2.0 * (q.y * q.y + q.z * q.z);
  const cysz = 2.0 * (q.w * q.z + q.x * q.y);
  const cy_sq = cycz * cycz + cysz * cysz;
  if (cy_sq > 1e-20) {
    return Math.atan2(cysz, cycz);
  } else {
    return Math.atan2(2.0 * q.w * q.z, q.w * q.w - q.z * q.z);
  }
}

/** Converts value in radians to degrees. */
export function toDegrees(radians: number) {
  return (180 * radians) / Math.PI;
}

const zeroPose2d: Pose2d = { x: 0, y: 0, theta: 0 };
const zeroRotation3d: Rotation3d = { x: 0, y: 0, z: 0 };

/** Constructs {@link Pose2d} from the raw value. */
export function toPose2d(value: unknown, structuredType?: StructuredTypeDescriptor): Pose2d {
  if (value == null) {
    return zeroPose2d;
  }

  if (Array.isArray(value)) {
    // NOTE: we don't know the measurement unit of theta in this case, assume degrees;
    // but allow widget component to specify conversion if necessary
    return {
      x: typeof value[0] === "number" ? value[0] : 0,
      y: typeof value[1] === "number" ? value[1] : 0,
      theta: typeof value[2] === "number" ? value[2] : 0,
    };
  }

  try {
    if (typeof value === "object") {
      if (structuredType) {
        switch (structuredType.format) {
          case "struct":
            switch (structuredType.name) {
              case "Pose2d": {
                const { translation, rotation } = value as Pose2dStruct;
                return {
                  x: translation.x,
                  y: translation.y,
                  theta: toDegrees(rotation.value),
                };
              }

              case "Pose3d": {
                const { translation, rotation } = value as Pose3dStruct;
                return {
                  x: translation.x,
                  y: translation.y,
                  theta: toDegrees(getYaw(rotation.q)),
                };
              }
            }
            break;

          case "protobuf":
            switch (structuredType.name) {
              case "wpi.proto.ProtobufPose2d": {
                const { translation, rotation } = value as Pose2dProto;
                return {
                  x: translation.x,
                  y: translation.y,
                  theta: toDegrees(rotation.value),
                };
              }

              case "wpi.proto.ProtobufPose3d": {
                const { translation, rotation } = value as Pose3dProto;
                return {
                  x: translation.x,
                  y: translation.y,
                  theta: toDegrees(getYaw(rotation.q)),
                };
              }
            }
            break;

          case "composite":
            switch (structuredType.name) {
              case "Field2d": {
                const v = value as Field2dSendable;
                return {
                  x: v.Robot[0],
                  y: v.Robot[1],
                  theta: toDegrees(v.Robot[2]),
                };
              }
            }
            break;
        }
      }
    }
  } catch {
    // swallow invalid data
  }

  return zeroPose2d;
}

/** Constructs {@link Rotation3d} from the raw value. */
export function toRotation3d(value: unknown, structuredType?: StructuredTypeDescriptor): Rotation3d {
  if (value == null) {
    return zeroRotation3d;
  }

  // assume yaw
  if (typeof value === "number") {
    return { x: 0, y: 0, z: value };
  }

  // assume [x, y, z] or [roll, pitch, yaw]
  if (Array.isArray(value)) {
    // NOTE: we don't know the measurement unit in this case, assume degrees;
    // but allow widget component to specify conversion if necessary
    return {
      x: typeof value[0] === "number" ? value[0] : 0,
      y: typeof value[1] === "number" ? value[1] : 0,
      z: typeof value[2] === "number" ? value[2] : 0,
    };
  }

  try {
    if (typeof value === "object") {
      if (structuredType) {
        switch (structuredType.format) {
          case "struct":
            switch (structuredType.name) {
              case "Pose2d": {
                const { rotation } = value as Pose2dStruct;
                return {
                  x: 0,
                  y: 0,
                  z: toDegrees(rotation.value),
                };
              }

              case "Pose3d": {
                const { rotation } = value as Pose3dStruct;
                return {
                  x: toDegrees(getRoll(rotation.q)),
                  y: toDegrees(getPitch(rotation.q)),
                  z: toDegrees(getYaw(rotation.q)),
                };
              }

              case "Rotation2d": {
                const rotation = value as Rotation2dStruct;
                return {
                  x: 0,
                  y: 0,
                  z: toDegrees(rotation.value),
                };
              }

              case "Rotation3d": {
                const rotation = value as Rotation3dStruct;
                return {
                  x: toDegrees(getRoll(rotation.q)),
                  y: toDegrees(getPitch(rotation.q)),
                  z: toDegrees(getYaw(rotation.q)),
                };
              }

              case "Quaternion": {
                const q = value as QuaternionStruct;
                return {
                  x: toDegrees(getRoll(q)),
                  y: toDegrees(getPitch(q)),
                  z: toDegrees(getYaw(q)),
                };
              }
            }
            break;

          case "protobuf":
            switch (structuredType.name) {
              case "wpi.proto.ProtobufPose2d": {
                const { rotation } = value as Pose2dProto;
                return {
                  x: 0,
                  y: 0,
                  z: toDegrees(rotation.value),
                };
              }

              case "wpi.proto.ProtobufPose3d": {
                const { rotation } = value as Pose3dProto;
                return {
                  x: toDegrees(getRoll(rotation.q)),
                  y: toDegrees(getPitch(rotation.q)),
                  z: toDegrees(getYaw(rotation.q)),
                };
              }

              case "wpi.proto.ProtobufRotation2d": {
                const rotation = value as Rotation2dProto;
                return {
                  x: 0,
                  y: 0,
                  z: toDegrees(rotation.value),
                };
              }

              case "wpi.proto.ProtobufRotation3d": {
                const rotation = value as Rotation3dProto;
                return {
                  x: toDegrees(getRoll(rotation.q)),
                  y: toDegrees(getPitch(rotation.q)),
                  z: toDegrees(getYaw(rotation.q)),
                };
              }

              case "wpi.proto.ProtobufQuaternion": {
                const q = value as QuaternionProto;
                return {
                  x: toDegrees(getRoll(q)),
                  y: toDegrees(getPitch(q)),
                  z: toDegrees(getYaw(q)),
                };
              }
            }
            break;

          case "composite":
            switch (structuredType.name) {
              case "Field2d": {
                const v = value as Field2dSendable;
                return {
                  x: 0,
                  y: 0,
                  z: toDegrees(v.Robot[2]),
                };
              }

              case "Gyro": {
                const v = value as GyroSendable;
                return {
                  x: 0,
                  y: 0,
                  z: v.Value,
                };
              }

              case "ADIS16448 IMU":
              case "ADIS16470 IMU": {
                const v = value as ADIS164xxIMUSendable;
                return {
                  x: 0,
                  y: 0,
                  z: v["Yaw Angle"],
                };
              }
            }
            break;
        }
      }
    }
  } catch {
    // swallow invalid data
  }

  return zeroRotation3d;
}

/** Returns actual data or preview data depending on the mode. */
export function withPreview<T>(mode: "template" | "design" | undefined, data: T | undefined, previewData: T) {
  if (mode === "template") {
    return [previewData, true] as const;
  }

  if (mode === "design" && data === undefined) {
    return [previewData, true] as const;
  }

  return [data, false] as const;
}

/** Determines whether the widget data slot accepts the data channel. */
export function canAccept(slot: WidgetDescriptorSlot | null | undefined, channel: DataChannel) {
  // assume anything goes if there is no slot specification
  if (slot == null) {
    return true;
  }

  if (slot.accepts == null) {
    return true;
  }

  if (channel.dataType === "json") {
    if (channel.structuredType != null) {
      // strip typical protobuf prefix
      const typeName = channel.structuredType.name.startsWith("wpi.proto.Protobuf")
        ? channel.structuredType.name.slice(18)
        : channel.structuredType.name;

      return slot.accepts.json != null && slot.accepts.json.includes(typeName);
    }

    return false;
  }

  if (channel.dataType === "composite") {
    return (
      slot.accepts.composite != null &&
      channel.structuredType != null &&
      slot.accepts.composite.includes(channel.structuredType.name)
    );
  }

  return slot.accepts.primitive != null && slot.accepts.primitive.includes(channel.dataType);
}

/** Returns transformed numeric value. */
export function applyNumericTransform(value: number, transform: WidgetPropsWithNumericValue["valueTransform"]) {
  let v = value;
  if (transform) {
    if (transform.absolute) {
      v = Math.abs(v);
    }
    if (transform.scale != null) {
      v *= transform.scale;
    }
  }

  return v;
}

/** Determines whether transform represents an identity (trivial) transform. */
export function isIdentityTransform(transform: WidgetPropsWithNumericValue["valueTransform"]) {
  return (
    transform == null ||
    ((transform.absolute == null || !transform.absolute) && (transform.scale == null || transform.scale === 1))
  );
}
