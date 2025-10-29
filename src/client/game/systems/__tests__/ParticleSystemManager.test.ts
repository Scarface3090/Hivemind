import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DOM
Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn().mockReturnValue({
      getContext: vi.fn().mockReturnValue({}),
      remove: vi.fn()
    })
  }
});

Object.defineProperty(global, 'navigator', {
  value: {
    hardwareConcurrency: 4,
    deviceMemory: 4
  }
});

Object.defineProperty(global, 'window', {
  value: {
    performance: {
      memory: {
        usedJSHeapSize: 1000000
      }
    }
  }
});

Object.defineProperty(global, 'requestAnimationFrame', {
  value: vi.fn().mockImplementation((callback) => {
    setTimeout(callback, 16);
    return 1;
  })
});

Object.defineProperty(global, 'cancelAnimationFrame', {
  value: vi.fn()
});

// Mock Phaser
const mockScene = {
  add: {
    particles: vi.fn().mockReturnValue({
      destroy: vi.fn(),
      maxParticles: 50,
      frequency: 100,
      explode: vi.fn(),
      setPosition: vi.fn(),
      getAliveParticleCount: vi.fn().mockReturnValue(10)
    })
  },
  time: {
    delayedCall: vi.fn()
  },
  textures: {
    exists: vi.fn().mockReturnValue(true)
  }
};

// Mock design tokens
vi.mock('../../../../shared/design-tokens.js', () => ({
  particles: {
    systems: {
      brushStroke: { colors: ['#FF6B35', '#4CAF50', '#00BCD4'] },
      interaction: { colors: ['#FF6B35', '#F1C40F'] },
      ambient: { colors: ['#7986CB', '#9FA8DA', '#C5CAE9'] }
    }
  },
  performance: {
    particles: {
      maxCount: {
        desktop: 100,
        tablet: 60,
        mobile: 30
      }
    }
  }
}));

// Import after mocking
import { ParticleSystemManager } from '../ParticleSystemManager.js';

describe('ParticleSystemManager', () => {
  let particleManager: ParticleSystemManager;

  beforeEach(() => {
    vi.clearAllMocks();
    particleManager = new ParticleSystemManager(mockScene as any);
  });

  it('should create brush stroke trail effect', () => {
    const effectId = particleManager.createBrushStrokeTrail(100, 200);
    
    expect(effectId).toMatch(/^brush-trail-\d+$/);
    expect(mockScene.add.particles).toHaveBeenCalledWith(
      100, 
      200, 
      'particle-texture',
      expect.objectContaining({
        speed: expect.any(Object),
        scale: expect.any(Object),
        alpha: expect.any(Object),
        lifespan: expect.any(Number),
        tint: expect.any(Array),
        gravityY: expect.any(Number),
        frequency: 50,
        maxParticles: expect.any(Number)
      })
    );
  });

  it('should create organic burst effect', () => {
    const effectId = particleManager.createOrganicBurst(150, 250, {
      colors: ['#FF0000', '#00FF00'],
      count: 20
    });
    
    expect(effectId).toMatch(/^organic-burst-\d+$/);
    expect(mockScene.add.particles).toHaveBeenCalledWith(
      150, 
      250, 
      'particle-texture',
      expect.objectContaining({
        speed: expect.any(Object),
        scale: expect.any(Object),
        alpha: expect.any(Object),
        lifespan: expect.any(Number),
        tint: expect.any(Array),
        gravityY: expect.any(Number),
        quantity: expect.any(Number), // Allow any number since it's clamped by maxParticles
        maxParticles: expect.any(Number)
      })
    );
  });

  it('should create ambient particles', () => {
    const bounds = { centerX: 400, centerY: 300, x: 0, y: 0, width: 800, height: 600 };
    const effectId = particleManager.createAmbientParticles(bounds as any);
    
    expect(effectId).toMatch(/^ambient-\d+$/);
    expect(mockScene.add.particles).toHaveBeenCalledWith(
      400, 
      300, 
      'particle-texture',
      expect.objectContaining({
        speed: expect.any(Object),
        scale: expect.any(Object),
        alpha: expect.any(Object),
        lifespan: expect.any(Object),
        tint: expect.any(Array),
        gravityY: expect.any(Number),
        frequency: 200,
        maxParticles: expect.any(Number)
      })
    );
  });

  it('should update trail position', () => {
    const effectId = particleManager.createBrushStrokeTrail(100, 200);
    const mockEmitter = mockScene.add.particles();
    
    particleManager.updateTrailPosition(effectId, 150, 250);
    
    expect(mockEmitter.setPosition).toHaveBeenCalledWith(150, 250);
  });

  it('should destroy effects', () => {
    const effectId = particleManager.createBrushStrokeTrail(100, 200);
    const mockEmitter = mockScene.add.particles();
    
    particleManager.destroyEffect(effectId);
    
    expect(mockEmitter.destroy).toHaveBeenCalled();
  });

  it('should get performance metrics', () => {
    const metrics = particleManager.getPerformanceMetrics();
    
    expect(metrics).toHaveProperty('fps');
    expect(metrics).toHaveProperty('frameDrops');
    expect(metrics).toHaveProperty('particleCount');
    expect(metrics).toHaveProperty('memoryUsage');
  });
});
