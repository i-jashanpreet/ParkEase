import mongoose from "mongoose";

const SHA256_HEX_REGEX = /^[a-f0-9]{64}$/;

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "userId is required"],
    },
    tokenHash: {
      type: String,
      required: [true, "tokenHash is required"],
      trim: true,
      match: [SHA256_HEX_REGEX, "tokenHash must be a valid SHA-256 hex digest"],
    },
    familyId: {
      type: String,
      required: [true, "familyId is required"],
      trim: true,
    },
    expiresAt: {
      type: Date,
      required: [true, "expiresAt is required"],
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    replacedByTokenHash: {
      type: String,
      default: null,
      trim: true,
      validate: {
        validator(value) {
          return value === null || SHA256_HEX_REGEX.test(value);
        },
        message: "replacedByTokenHash must be null or a valid SHA-256 hex digest",
      },
    },
    createdByIp: {
      type: String,
      default: null,
      trim: true,
    },
    userAgent: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

refreshTokenSchema.index({ tokenHash: 1 }, { unique: true });
refreshTokenSchema.index({ userId: 1 });
refreshTokenSchema.index({ familyId: 1 });
// TTL index purges token records only after their configured expiration (`expiresAt`),
// preserving revoked tokens throughout their validity window for reuse detection.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RefreshToken =
  mongoose.models.RefreshToken ||
  mongoose.model("RefreshToken", refreshTokenSchema);

export default RefreshToken;
