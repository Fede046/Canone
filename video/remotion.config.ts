import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);
Config.setCodec('h264');
Config.setCrf(17);
Config.setAudioCodec('aac');
Config.setAudioBitrate('256k');
