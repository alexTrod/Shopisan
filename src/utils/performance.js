import { PerformanceObserver } from 'react-native-performance';

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      renderTimes: [],
      memoryUsage: [],
      bundleSize: null,
    };
    
    this.isEnabled = __DEV__ ? false : true; // Only enable in production
  }

  // Track component render time
  trackRenderTime(componentName, startTime) {
    if (!this.isEnabled) return;
    
    const renderTime = performance.now() - startTime;
    this.metrics.renderTimes.push({
      component: componentName,
      time: renderTime,
      timestamp: Date.now(),
    });

    // Keep only last 100 measurements
    if (this.metrics.renderTimes.length > 100) {
      this.metrics.renderTimes = this.metrics.renderTimes.slice(-100);
    }

    // Log slow renders
    if (renderTime > 16) { // 16ms = 60fps threshold
      console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
    }
  }

  // Track memory usage
  trackMemoryUsage() {
    if (!this.isEnabled) return;
    
    if (global.performance && global.performance.memory) {
      const memory = global.performance.memory;
      this.metrics.memoryUsage.push({
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        timestamp: Date.now(),
      });

      // Keep only last 50 measurements
      if (this.metrics.memoryUsage.length > 50) {
        this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-50);
      }
    }
  }

  // Get performance summary
  getPerformanceSummary() {
    if (!this.isEnabled) return null;

    const renderTimes = this.metrics.renderTimes;
    const memoryUsage = this.metrics.memoryUsage;

    if (renderTimes.length === 0) return null;

    const avgRenderTime = renderTimes.reduce((sum, item) => sum + item.time, 0) / renderTimes.length;
    const maxRenderTime = Math.max(...renderTimes.map(item => item.time));
    const slowRenders = renderTimes.filter(item => item.time > 16).length;

    return {
      renderTimes: {
        average: avgRenderTime.toFixed(2),
        max: maxRenderTime.toFixed(2),
        slowRenders,
        total: renderTimes.length,
      },
      memoryUsage: memoryUsage.length > 0 ? {
        average: (memoryUsage.reduce((sum, item) => sum + item.used, 0) / memoryUsage.length / 1024 / 1024).toFixed(2),
        latest: (memoryUsage[memoryUsage.length - 1]?.used / 1024 / 1024).toFixed(2),
      } : null,
      timestamp: Date.now(),
    };
  }

  // Start monitoring
  startMonitoring() {
    if (!this.isEnabled) return;

    // Monitor memory every 30 seconds
    this.memoryInterval = setInterval(() => {
      this.trackMemoryUsage();
    }, 30000);

    console.log('Performance monitoring started');
  }

  // Stop monitoring
  stopMonitoring() {
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
      this.memoryInterval = null;
    }
  }

  // Reset metrics
  reset() {
    this.metrics = {
      renderTimes: [],
      memoryUsage: [],
      bundleSize: null,
    };
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Export functions for easy use
export const trackRenderTime = (componentName, startTime) => 
  performanceMonitor.trackRenderTime(componentName, startTime);

export const startPerformanceMonitoring = () => 
  performanceMonitor.startMonitoring();

export const stopPerformanceMonitoring = () => 
  performanceMonitor.stopMonitoring();

export const getPerformanceSummary = () => 
  performanceMonitor.getPerformanceSummary();

export default performanceMonitor;
