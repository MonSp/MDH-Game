import { NPCWorldService } from '../../services/NPCWorldService';

export class FrontlineService {
  private static instance: FrontlineService;

  static getInstance(): FrontlineService {
    if (!FrontlineService.instance) {
      FrontlineService.instance = new FrontlineService();
    }
    return FrontlineService.instance;
  }

  getSummary(): string {
    return NPCWorldService.getInstance().buildFrontlineSummary();
  }

  reportAnomaly(desc: string): void {
    NPCWorldService.getInstance().reportAnomaly(desc);
  }
}
