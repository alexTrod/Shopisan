/**
 * Performance Logger Utility
 * Tracks timing of various operations to identify bottlenecks
 */

const timers = {};
const completedTimings = [];

const perfLogger = {
  // Start timing an operation
  start: (label) => {
    timers[label] = {
      startTime: Date.now(),
      label
    };
    console.log(`[PERF] ⏱️ START: ${label}`);
  },

  // End timing and log the duration
  end: (label) => {
    const timer = timers[label];
    if (!timer) {
      console.warn(`[PERF] ⚠️ No timer found for: ${label}`);
      return 0;
    }

    const duration = Date.now() - timer.startTime;
    const durationStr = duration > 1000
      ? `${(duration / 1000).toFixed(2)}s`
      : `${duration}ms`;

    // Color code based on duration
    let emoji = '✅';
    if (duration > 3000) emoji = '🔴'; // Critical: > 3s
    else if (duration > 1000) emoji = '🟠'; // Warning: > 1s
    else if (duration > 500) emoji = '🟡'; // Attention: > 500ms

    console.log(`[PERF] ${emoji} END: ${label} took ${durationStr}`);

    completedTimings.push({
      label,
      duration,
      timestamp: new Date().toISOString()
    });

    delete timers[label];
    return duration;
  },

  // Log a checkpoint within an operation
  checkpoint: (label, message) => {
    const timer = timers[label];
    if (!timer) {
      console.log(`[PERF] 📍 ${label}: ${message}`);
      return;
    }
    const elapsed = Date.now() - timer.startTime;
    console.log(`[PERF] 📍 ${label} +${elapsed}ms: ${message}`);
  },

  // Measure an async function
  measure: async (label, fn) => {
    perfLogger.start(label);
    try {
      const result = await fn();
      perfLogger.end(label);
      return result;
    } catch (error) {
      perfLogger.end(label);
      throw error;
    }
  },

  // Print summary of all completed timings
  summary: () => {
    console.log('\n[PERF] ═══════════════════════════════════════');
    console.log('[PERF] 📊 PERFORMANCE SUMMARY');
    console.log('[PERF] ═══════════════════════════════════════');

    const sorted = [...completedTimings].sort((a, b) => b.duration - a.duration);

    sorted.forEach((timing, index) => {
      const durationStr = timing.duration > 1000
        ? `${(timing.duration / 1000).toFixed(2)}s`
        : `${timing.duration}ms`;

      let emoji = '✅';
      if (timing.duration > 3000) emoji = '🔴';
      else if (timing.duration > 1000) emoji = '🟠';
      else if (timing.duration > 500) emoji = '🟡';

      console.log(`[PERF] ${index + 1}. ${emoji} ${timing.label}: ${durationStr}`);
    });

    const total = completedTimings.reduce((sum, t) => sum + t.duration, 0);
    console.log('[PERF] ───────────────────────────────────────');
    console.log(`[PERF] Total tracked time: ${(total / 1000).toFixed(2)}s`);
    console.log('[PERF] ═══════════════════════════════════════\n');
  },

  // Clear all timings
  clear: () => {
    Object.keys(timers).forEach(key => delete timers[key]);
    completedTimings.length = 0;
    console.log('[PERF] 🗑️ Cleared all performance data');
  },

  // Log render count for components
  logRender: (componentName, props = {}) => {
    const propsStr = Object.keys(props).length > 0
      ? ` with props: ${JSON.stringify(props)}`
      : '';
    console.log(`[PERF] 🔄 RENDER: ${componentName}${propsStr}`);
  }
};

export default perfLogger;
