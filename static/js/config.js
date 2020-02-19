// Config
const CHUNK_RENDER_SIZE = 48;

class Config {
  constructor(fresh = false) {
    if (fresh) {
      this.scale = 1;
      this.offsetX = 0;
      this.offsetZ = 0;
      this.nowChunkX = 0;
      this.nowChunkZ = 0;
    } else {
      this.scale = loadNumberFromPersist("scale", 1);
      this.offsetX = loadNumberFromPersist("offsetX", 0);
      this.offsetZ = loadNumberFromPersist("offsetZ", 0);
      this.nowChunkX = loadNumberFromPersist("nowChunkX", 0);
      this.nowChunkZ = loadNumberFromPersist("nowChunkZ", 0);
    }

    this.drag = false;
    this.nowChunksX = 0;
    this.nowChunksZ = 0;
    this.canvasX = 0;
    this.canvasY = 0;
  }

  persist() {
    persist("scale", this.scale);
    persist("offsetX", this.offsetX);
    persist("offsetZ", this.offsetZ);
    persist("nowChunkX", this.nowChunkX);
    persist("nowChunkZ", this.nowChunkZ);
  }

  get chunkSize() {
    return CHUNK_RENDER_SIZE * this.scale;
  }

  get xChunkCount() {
    return Math.ceil(this.canvasX / this.chunkSize);
  }

  get yChunkCount() {
    return Math.ceil(this.canvasY / this.chunkSize);
  }

  recalculateNowChunks() {
    this.nowChunksX = this.xChunkCount + 2;
    this.nowChunksZ = this.yChunkCount + 2;
  }
}

const config = new Config();
