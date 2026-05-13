import { BlockType, CHUNK_SIZE, CHUNK_TOTAL, blockIndex } from './BlockTypes';

export class ChunkData {
  public blocks: Uint8Array;
  public cx: number;
  public cy: number;
  public cz: number;
  public isDirty = true;

  constructor(cx: number, cy: number, cz: number) {
    this.cx = cx;
    this.cy = cy;
    this.cz = cz;
    this.blocks = new Uint8Array(CHUNK_TOTAL);
  }

  getBlock(bx: number, by: number, bz: number): BlockType {
    if (bx < 0 || bx >= CHUNK_SIZE || by < 0 || by >= CHUNK_SIZE || bz < 0 || bz >= CHUNK_SIZE) {
      return BlockType.AIR;
    }
    return this.blocks[blockIndex(bx, by, bz)] as BlockType;
  }

  setBlock(bx: number, by: number, bz: number, type: BlockType): void {
    if (bx < 0 || bx >= CHUNK_SIZE || by < 0 || by >= CHUNK_SIZE || bz < 0 || bz >= CHUNK_SIZE) return;
    this.blocks[blockIndex(bx, by, bz)] = type;
    this.isDirty = true;
  }

  isEmpty(): boolean {
    for (let i = 0; i < CHUNK_TOTAL; i++) {
      if (this.blocks[i] !== BlockType.AIR) return false;
    }
    return true;
  }
}
