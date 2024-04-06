/**
 * Represents information about the format of the video stream.
 */
export interface FormatInfo {
  /** The width of the video frame in pixels. */
  width: number;
  /** The height of the video frame in pixels. */
  height: number;
  /** The four-character code representing the video format. */
  fourcc: string;
  /** Frames per second (FPS) of the video stream. */
  fps: number;
  /** Bits per pixel (BPP) of the video stream. */
  bpp: number;
}

/**
 * Enumerates the properties for camera capabilities.
 */
export enum CapPropertyID {
  Exposure = 1,
  Focus = 2,
  Zoom = 3,
  WhiteBalance = 4,
  Gain = 5,
  Brightness = 6,
  Contrast = 7,
  Saturation = 8,
  Gamma = 9,
  Hue = 10,
  Sharpness = 11,
  BacklightComp = 12,
  PowerLineFreq = 13,
  Last = 14,
}

/**
 * Enumerates the levels of logging.
 */
export enum LogLevel {
  LOG_EMERG = 0,
  LOG_ALERT = 1,
  LOG_CRIT = 2,
  LOG_ERR = 3,
  LOG_WARNING = 4,
  LOG_NOTICE = 5,
  LOG_INFO = 6,
  LOG_DEBUG = 7,
  LOG_VERBOSE = 8,
}

/////////////////////////////////////
// Camera types
/////////////////////////////////////

/**
 * Represents information about a camera device.
 */
export interface DeviceInfo {
  /** The name of the camera device. */
  name: string;
  /** The unique identifier of the camera device. */
  id: number;
  /** Array of supported formats along with their identifiers. */
  formats: FormatInfoWithId[];
}

/**
 * Represents information about a video format along with its identifier.
 */
export type FormatInfoWithId = FormatInfo & {
  /** The identifier of the format. */
  id: number;
};
