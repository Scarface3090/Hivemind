import Phaser from 'phaser';

export class PreloaderScene extends Phaser.Scene {
  constructor() {
    super('PreloaderScene');
  }

  preload(): void {
    // Create particle textures programmatically
    this.createParticleTextures();
  }

  create(): void {
    // Automatically start the GuessingScene after preloading
    this.scene.start('GuessingScene');
  }

  private createParticleTextures(): void {
    // Create a circular particle texture
    const graphics = this.add.graphics();
    
    // Main particle texture - circular with soft edges
    graphics.fillStyle(0xffffff);
    graphics.fillCircle(8, 8, 6);
    graphics.generateTexture('particle-texture', 16, 16);
    
    // Brush stroke particle texture - more organic shape
    graphics.clear();
    graphics.fillStyle(0xffffff);
    graphics.fillEllipse(10, 8, 12, 8);
    graphics.fillEllipse(8, 10, 8, 12);
    graphics.generateTexture('brush-particle', 20, 20);
    
    // Small dot particle for ambient effects
    graphics.clear();
    graphics.fillStyle(0xffffff);
    graphics.fillCircle(4, 4, 3);
    graphics.generateTexture('dot-particle', 8, 8);
    
    // Cleanup
    graphics.destroy();
  }
}
