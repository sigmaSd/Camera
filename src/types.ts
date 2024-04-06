export interface FormatInfo {
  width: number;
  height: number;
  fourcc: string;
  fps: number;
  bpp: number;
}

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

export interface DeviceInfo {
  name: string;
  id: number;
  formats: FormatInfoWithId[];
}

export type FormatInfoWithId = FormatInfo & { id: number };
