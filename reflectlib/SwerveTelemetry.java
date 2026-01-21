package frc.robot.lib;

import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import edu.wpi.first.math.kinematics.SwerveModuleState;
import edu.wpi.first.util.struct.Struct;
import edu.wpi.first.util.struct.StructSerializable;
import java.nio.ByteBuffer;

/**
 * A serializable swerve telemetry structure that maintains minimum necessary information to
 * visualize swerve behavior.
 *
 * <p>Swerve telemetry is commonly used on a hot update path. To minimize unnecessary allocations
 * this class publicly exposes its fields as non-final. Be careful if you choose to perform in place
 * data mutations.
 */
public class SwerveTelemetry implements StructSerializable {
  public Rotation2d rotation;
  public SwerveModuleState[] currentStates;
  public SwerveModuleState[] desiredStates;
  public ChassisSpeeds currentSpeeds;
  public ChassisSpeeds desiredSpeeds;

  public SwerveTelemetry() {
    this(
        Rotation2d.kZero,
        new SwerveModuleState[] {
          new SwerveModuleState(),
          new SwerveModuleState(),
          new SwerveModuleState(),
          new SwerveModuleState(),
        },
        new SwerveModuleState[] {
          new SwerveModuleState(),
          new SwerveModuleState(),
          new SwerveModuleState(),
          new SwerveModuleState(),
        },
        new ChassisSpeeds(),
        new ChassisSpeeds());
  }

  public SwerveTelemetry(
      Rotation2d rotation,
      SwerveModuleState[] currentStates,
      SwerveModuleState[] desiredStates,
      ChassisSpeeds currentSpeeds,
      ChassisSpeeds desiredSpeeds) {
    this.rotation = rotation;
    this.currentStates = currentStates;
    this.desiredStates = desiredStates;
    this.currentSpeeds = currentSpeeds;
    this.desiredSpeeds = desiredSpeeds;
  }

  public static final SwerveTelemetryStruct struct = new SwerveTelemetryStruct();

  public static final class SwerveTelemetryStruct implements Struct<SwerveTelemetry> {
    @Override
    public Class<SwerveTelemetry> getTypeClass() {
      return SwerveTelemetry.class;
    }

    @Override
    public String getTypeName() {
      return "SwerveTelemetry";
    }

    @Override
    public int getSize() {
      return Rotation2d.struct.getSize()
          + SwerveModuleState.struct.getSize() * 8
          + ChassisSpeeds.struct.getSize() * 2;
    }

    @Override
    public String getSchema() {
      return "Rotation2d rotation;SwerveModuleState currentStates[4];SwerveModuleState desiredStates[4];ChassisSpeeds currentSpeeds;ChassisSpeeds desiredSpeeds;";
    }

    @Override
    public Struct<?>[] getNested() {
      return new Struct<?>[] {
        Rotation2d.struct, SwerveModuleState.struct, ChassisSpeeds.struct,
      };
    }

    @Override
    public SwerveTelemetry unpack(ByteBuffer bb) {
      return new SwerveTelemetry(
          Rotation2d.struct.unpack(bb),
          new SwerveModuleState[] {
            SwerveModuleState.struct.unpack(bb),
            SwerveModuleState.struct.unpack(bb),
            SwerveModuleState.struct.unpack(bb),
            SwerveModuleState.struct.unpack(bb),
          },
          new SwerveModuleState[] {
            SwerveModuleState.struct.unpack(bb),
            SwerveModuleState.struct.unpack(bb),
            SwerveModuleState.struct.unpack(bb),
            SwerveModuleState.struct.unpack(bb),
          },
          ChassisSpeeds.struct.unpack(bb),
          ChassisSpeeds.struct.unpack(bb));
    }

    @Override
    public void pack(ByteBuffer bb, SwerveTelemetry value) {
      Rotation2d.struct.pack(bb, value.rotation);
      SwerveModuleState.struct.pack(bb, value.currentStates[0]);
      SwerveModuleState.struct.pack(bb, value.currentStates[1]);
      SwerveModuleState.struct.pack(bb, value.currentStates[2]);
      SwerveModuleState.struct.pack(bb, value.currentStates[3]);
      SwerveModuleState.struct.pack(bb, value.desiredStates[0]);
      SwerveModuleState.struct.pack(bb, value.desiredStates[1]);
      SwerveModuleState.struct.pack(bb, value.desiredStates[2]);
      SwerveModuleState.struct.pack(bb, value.desiredStates[3]);
      ChassisSpeeds.struct.pack(bb, value.currentSpeeds);
      ChassisSpeeds.struct.pack(bb, value.desiredSpeeds);
    }
  }
}
