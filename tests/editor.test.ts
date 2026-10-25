import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ASPECT_RATIO_PRESETS,
  DEFAULT_COLOR,
  DEFAULT_TRANSFORM,
  calculateProjectDuration,
  formatTimecode,
  framesToSeconds,
  quantizeToFrame,
  rippleDeleteClip,
  secondsToFrames,
  snapTimeToTargets,
  splitClipAtTime,
  trimClipEdges,
} from '../src/editor/timebase';
import { evaluateEasing, interpolateProperty } from '../src/animation/keyframes';
import { generateGroundedAIPlan, validateAIOperation } from '../src/ai/tools';
import { Keyframe, ProjectData, TimelineClip } from '../src/types/editor';

function createSampleClip(overrides: Partial<TimelineClip> = {}): TimelineClip {
  return {
    id: 'clip_1',
    trackId: 'track_v1',
    assetId: 'asset_1',
    name: 'GTA Vice Chase.mp4',
    type: 'video',
    startTime: 0,
    duration: 10,
    sourceStart: 0,
    sourceDuration: 20,
    speed: 1,
    reverse: false,
    volume: 100,
    muted: false,
    pan: 0,
    fadeIn: 0,
    fadeOut: 0,
    audioDucking: false,
    transform: { ...DEFAULT_TRANSFORM },
    color: { ...DEFAULT_COLOR },
    effects: [],
    keyframes: [],
    ...overrides,
  };
}

test('frame-rate calculations and SMPTE timecode formatting', () => {
  assert.equal(secondsToFrames(1.5, 30), 45);
  assert.equal(framesToSeconds(45, 30), 1.5);
  assert.equal(quantizeToFrame(1.0333, 30), 1.033333);
  assert.equal(formatTimecode(0, 30), '00:00:00:00');
  assert.equal(formatTimecode(65.5, 30), '00:01:05:15');
  assert.equal(formatTimecode(1.5, 60), '00:00:01:30');
});

test('aspect ratio presets provide accurate canvas dimensions', () => {
  assert.equal(ASPECT_RATIO_PRESETS['16:9'].width, 1920);
  assert.equal(ASPECT_RATIO_PRESETS['16:9'].height, 1080);
  assert.equal(ASPECT_RATIO_PRESETS['9:16'].width, 1080);
  assert.equal(ASPECT_RATIO_PRESETS['9:16'].height, 1920);
  assert.equal(ASPECT_RATIO_PRESETS['1:1'].width, 1080);
  assert.equal(ASPECT_RATIO_PRESETS['1:1'].height, 1080);
});

test('splitClipAtTime splits clip accurately at playhead and adjusts keyframes', () => {
  const clip = createSampleClip({
    startTime: 2,
    duration: 8,
    sourceStart: 1,
    keyframes: [
      { id: 'kf1', property: 'scale', timeOffset: 1, value: 100, easing: 'linear' },
      { id: 'kf2', property: 'scale', timeOffset: 5, value: 130, easing: 'ease-out' },
    ],
  });

  // Outside clip returns null
  assert.equal(splitClipAtTime(clip, 1.0, 30), null);

  // Split at t = 5.0s (3s into clip)
  const split = splitClipAtTime(clip, 5.0, 30);
  assert.ok(split);
  const [left, right] = split;
  assert.equal(left.startTime, 2);
  assert.equal(left.duration, 3);
  assert.equal(left.sourceStart, 1);
  assert.equal(left.keyframes.length, 1);

  assert.equal(right.startTime, 5);
  assert.equal(right.duration, 5);
  assert.equal(right.sourceStart, 4);
  assert.equal(right.keyframes.length, 1);
  assert.equal(right.keyframes[0].timeOffset, 2);
});

test('trimClipEdges respects source media duration and frame boundaries', () => {
  const clip = createSampleClip({ startTime: 0, duration: 10, sourceStart: 2, sourceDuration: 12 });
  const trimmed = trimClipEdges(clip, 1, 15, 30);
  assert.equal(trimmed.startTime, 1);
  // sourceStart advanced by 1s -> 3s, max remaining source duration is 12 - 3 = 9s
  assert.equal(trimmed.sourceStart, 3);
  assert.equal(trimmed.duration, 9);
});

test('rippleDeleteClip shifts subsequent clips on the same track when ripple is enabled', () => {
  const c1 = createSampleClip({ id: 'c1', trackId: 'v1', startTime: 0, duration: 4 });
  const c2 = createSampleClip({ id: 'c2', trackId: 'v1', startTime: 4, duration: 5 });
  const c3 = createSampleClip({ id: 'c3', trackId: 'a1', startTime: 4, duration: 5 });

  const afterRipple = rippleDeleteClip([c1, c2, c3], 'c1', true);
  assert.equal(afterRipple.length, 2);
  assert.equal(afterRipple.find((c) => c.id === 'c2')?.startTime, 0);
  assert.equal(afterRipple.find((c) => c.id === 'c3')?.startTime, 4);
});

test('snapTimeToTargets snaps within threshold', () => {
  const res1 = snapTimeToTargets(3.92, [0, 4.0, 8.0], 0.15, true);
  assert.equal(res1.snapped, true);
  assert.equal(res1.time, 4.0);

  const res2 = snapTimeToTargets(3.5, [0, 4.0, 8.0], 0.15, true);
  assert.equal(res2.snapped, false);
  assert.equal(res2.time, 3.5);
});

test('keyframe interpolation handles linear, hold, and eased curves', () => {
  const keyframes: Keyframe[] = [
    { id: 'k1', property: 'scale', timeOffset: 0, value: 100, easing: 'linear' },
    { id: 'k2', property: 'scale', timeOffset: 2, value: 150, easing: 'linear' },
  ];

  assert.equal(interpolateProperty(keyframes, 'scale', 0, 100), 100);
  assert.equal(interpolateProperty(keyframes, 'scale', 1, 100), 125);
  assert.equal(interpolateProperty(keyframes, 'scale', 2, 100), 150);
  assert.equal(evaluateEasing(0.5, 'hold'), 0);
  assert.equal(evaluateEasing(1.0, 'hold'), 1);
});

test('AI operation validation accepts valid tools and rejects unsafe or invalid operations', () => {
  const validOp = validateAIOperation({
    tool: 'set_aspect_ratio',
    description: 'Convert to 9:16',
    args: { aspectRatio: '9:16' },
  });
  assert.equal(validOp.valid, true);

  const invalidTool = validateAIOperation({
    // @ts-expect-error testing unknown tool
    tool: 'execute_shell_command',
    args: { cmd: 'rm -rf /' },
  });
  assert.equal(invalidTool.valid, false);

  const invalidSpeed = validateAIOperation({
    tool: 'set_clip_speed',
    args: { speed: 99 },
  });
  assert.equal(invalidSpeed.valid, false);
});

test('generateGroundedAIPlan produces validated operations for natural language Short request', () => {
  const mockProject: ProjectData = {
    id: 'proj_1',
    version: 1,
    name: 'Test Project',
    updatedAt: Date.now(),
    aspectRatio: '16:9',
    width: 1920,
    height: 1080,
    fps: 30,
    backgroundFill: 'black',
    inPoint: null,
    outPoint: null,
    tracks: [],
    clips: [createSampleClip({ id: 'clip_v1', duration: 8 })],
    markers: [],
    assets: [],
    exportSettings: {
      format: 'webm',
      codec: 'vp9',
      resolution: '1080p',
      width: 1920,
      height: 1080,
      fps: 30,
      quality: 'high',
      videoBitrateMbps: 12,
      audioBitrateKbps: 192,
      audioSampleRate: 48000,
      includeVideo: true,
      includeAudio: true,
      burnCaptions: true,
      useServerRender: false,
    },
  };

  const plan = generateGroundedAIPlan(
    'Make a 30-second GTA 6 Short from the best action moments, add zoom effects, animated captions, and energetic transitions.',
    mockProject,
    'clip_v1'
  );

  assert.ok(plan.operations.length >= 5);
  assert.ok(plan.operations.some((op) => op.tool === 'set_aspect_ratio'));
  assert.ok(plan.operations.some((op) => op.tool === 'add_keyframe'));
  assert.ok(plan.operations.some((op) => op.tool === 'add_captions'));
  assert.ok(plan.operations.some((op) => op.tool === 'add_transition'));
  assert.equal(calculateProjectDuration(mockProject.clips, 10), 10);
});
