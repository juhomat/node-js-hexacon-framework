/**
 * CrawlSession Domain Entity
 * 
 * Represents a discovery and crawling session for a website.
 * Groups pages discovered during a single crawling operation.
 */

export interface CrawlSession {
  id: string;
  websiteId: string;
  maxPages: number;
  maxDepth: number;
  status: CrawlSessionStatus;
  pagesDiscovered: number;
  pagesCompleted: number;
  chunksCreated: number;
  startedAt?: Date;
  completedAt?: Date;
  metadata: CrawlSessionMetadata;
  createdAt: Date;
}

export enum CrawlSessionStatus {
  PENDING = 'pending',
  DISCOVERING = 'discovering',
  EXTRACTING = 'extracting',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface CrawlSessionMetadata {
  userId?: string;
  userAgent?: string;
  discoveryMethod?: 'sitemap' | 'crawling' | 'hybrid';
  targetContentTypes?: string[];
  skipPatterns?: string[];
  customSettings?: Record<string, any>;
  performanceMetrics?: {
    discoveryTimeMs?: number;
    extractionTimeMs?: number;
    processingTimeMs?: number;
    totalTimeMs?: number;
  };
  [key: string]: any;
}

export interface CreateCrawlSessionRequest {
  websiteId: string;
  maxPages: number;
  maxDepth: number;
  metadata?: Partial<CrawlSessionMetadata>;
}

export interface CrawlSessionProgress {
  session: CrawlSession;
  currentPhase: CrawlPhase;
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
  recentActivity: string[];
  estimatedTimeRemaining?: number;
}

export enum CrawlPhase {
  DISCOVERY = 'discovery',
  PRIORITIZATION = 'prioritization',
  EXTRACTION = 'extraction',
  CHUNKING = 'chunking',
  EMBEDDING = 'embedding',
  STORAGE = 'storage'
}

/**
 * Factory function to create a new CrawlSession entity
 */
export function createCrawlSession(request: CreateCrawlSessionRequest): Omit<CrawlSession, 'id' | 'createdAt'> {
  return {
    websiteId: request.websiteId,
    maxPages: request.maxPages,
    maxDepth: request.maxDepth,
    status: CrawlSessionStatus.PENDING,
    pagesDiscovered: 0,
    pagesCompleted: 0,
    chunksCreated: 0,
    metadata: {
      discoveryMethod: 'hybrid',
      userAgent: 'AI-Framework-Bot/1.0',
      ...request.metadata
    }
  };
}

/**
 * Utility functions for CrawlSession entity
 */
export class CrawlSessionUtils {
  static calculateProgress(session: CrawlSession, currentPhase: CrawlPhase): number {
    const phaseWeights = {
      [CrawlPhase.DISCOVERY]: 20,
      [CrawlPhase.PRIORITIZATION]: 5,
      [CrawlPhase.EXTRACTION]: 50,
      [CrawlPhase.CHUNKING]: 15,
      [CrawlPhase.EMBEDDING]: 5,
      [CrawlPhase.STORAGE]: 5
    };
    
    const completedPhases = this.getCompletedPhases(session.status);
    const completedWeight = completedPhases.reduce((sum, phase) => sum + phaseWeights[phase], 0);
    
    // Add partial progress for current phase
    let currentPhaseProgress = 0;
    if (currentPhase === CrawlPhase.DISCOVERY || currentPhase === CrawlPhase.EXTRACTION) {
      currentPhaseProgress = (session.pagesCompleted / session.maxPages) * phaseWeights[currentPhase];
    }
    
    return Math.min(100, completedWeight + currentPhaseProgress);
  }
  
  private static getCompletedPhases(status: CrawlSessionStatus): CrawlPhase[] {
    switch (status) {
      case CrawlSessionStatus.PENDING:
        return [];
      case CrawlSessionStatus.DISCOVERING:
        return [];
      case CrawlSessionStatus.EXTRACTING:
        return [CrawlPhase.DISCOVERY, CrawlPhase.PRIORITIZATION];
      case CrawlSessionStatus.PROCESSING:
        return [CrawlPhase.DISCOVERY, CrawlPhase.PRIORITIZATION, CrawlPhase.EXTRACTION];
      case CrawlSessionStatus.COMPLETED:
        return Object.values(CrawlPhase);
      default:
        return [];
    }
  }
  
  static estimateRemainingTime(session: CrawlSession, currentPhase: CrawlPhase): number | null {
    if (!session.startedAt) return null;
    
    const elapsedMs = Date.now() - session.startedAt.getTime();
    const progress = this.calculateProgress(session, currentPhase);
    
    if (progress <= 0) return null;
    
    const totalEstimatedMs = (elapsedMs / progress) * 100;
    return totalEstimatedMs - elapsedMs;
  }
  
  static canRetry(session: CrawlSession): boolean {
    return [CrawlSessionStatus.FAILED, CrawlSessionStatus.CANCELLED].includes(session.status);
  }
  
  static canCancel(session: CrawlSession): boolean {
    return [
      CrawlSessionStatus.PENDING,
      CrawlSessionStatus.DISCOVERING,
      CrawlSessionStatus.EXTRACTING,
      CrawlSessionStatus.PROCESSING
    ].includes(session.status);
  }
}
