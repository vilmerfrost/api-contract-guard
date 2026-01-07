/**
 * Hierarchical API Definitions
 * 
 * Defines parent-child relationships between API endpoints.
 * When testing, we first fetch resources from parent APIs,
 * then use those IDs to test child APIs.
 */

export interface ChildApiDefinition {
  /** The path pattern for the child API (with {id} placeholder) */
  pathPattern: string;
  /** Description of what this child API does */
  description: string;
  /** HTTP methods supported by this child API */
  methods: string[];
}

export interface ParentApiDefinition {
  /** The parent API path that returns a list of resources */
  parentPath: string;
  /** Description of the parent API */
  description: string;
  /** Field name to extract ID from response items */
  idField: string;
  /** Alternative field names for ID */
  alternativeIdFields?: string[];
  /** Child APIs that depend on resources from this parent */
  childApis: ChildApiDefinition[];
}

/**
 * Hierarchical API definitions for the PDQ API
 * Maps parent APIs to their child APIs
 * 
 * Based on the actual API structure:
 * - Systems: GET /api/v2/systems returns list, use 'system' field as ID
 * - Sourcefiles: GET /api/v3/sourcefiles returns list, use 'sourceFilename' as ID
 */
export const HIERARCHICAL_API_DEFINITIONS: ParentApiDefinition[] = [
  // ============================================
  // SYSTEMS - Parent API with many child APIs
  // ============================================
  {
    parentPath: '/api/v2/systems',
    description: 'Systems (v2)',
    idField: 'system',
    alternativeIdFields: ['sourcesystem', 'id', 'name', '_id'],
    childApis: [
      // v2 System child APIs
      {
        pathPattern: '/api/v2/systems/{id}',
        description: 'Get system details',
        methods: ['GET', 'POST']
      },
      {
        pathPattern: '/api/v2/connection/for/{id}',
        description: 'Connection for system',
        methods: ['GET', 'POST']
      },
      {
        pathPattern: '/api/v2/exportlist/for/{id}',
        description: 'Export list for system',
        methods: ['GET']
      },
      {
        pathPattern: '/api/v2/exportdefinition/for/{id}/{alias}',
        description: 'Export definition for system',
        methods: ['GET', 'POST']
      },
      {
        pathPattern: '/api/v2/next/workload/for/{id}',
        description: 'Next workload for system',
        methods: ['GET']
      },
      {
        pathPattern: '/api/v2/workload/history/for/{id}',
        description: 'Workload history for system',
        methods: ['GET']
      },
      {
        pathPattern: '/api/v2/workload/inprogress/for/{id}',
        description: 'In-progress workload for system',
        methods: ['GET']
      },
      // v3 Ingest child APIs (use sourcesystem from systems)
      {
        pathPattern: '/api/v3/ingest/connection/for/{id}',
        description: 'V3 Ingest connection for system',
        methods: ['GET', 'POST']
      },
      {
        pathPattern: '/api/v3/ingest/list/for/{id}',
        description: 'V3 Ingest list for system',
        methods: ['GET']
      },
      {
        pathPattern: '/api/v3/ingest/definition/for/{id}/{alias}',
        description: 'V3 Ingest definition for system',
        methods: ['GET', 'POST']
      },
      {
        pathPattern: '/api/v3/ingest/next/workload/for/{id}',
        description: 'V3 Ingest next workload for system',
        methods: ['GET']
      },
      {
        pathPattern: '/api/v3/ingest/workload/history/for/{id}',
        description: 'V3 Ingest workload history for system',
        methods: ['GET']
      },
      {
        pathPattern: '/api/v3/ingest/workload/inprogress/for/{id}',
        description: 'V3 Ingest workload in-progress for system',
        methods: ['GET']
      },
      // v3.1 Ingest child APIs
      {
        pathPattern: '/api/v3.1/ingest/list/for/{id}',
        description: 'V3.1 Ingest list for system',
        methods: ['GET']
      },
      {
        pathPattern: '/api/v3.1/ingest/definition/for/{id}/{alias}',
        description: 'V3.1 Ingest definition for system',
        methods: ['GET', 'POST']
      }
    ]
  },
  
  // ============================================
  // SOURCEFILES v2 - Parent with child APIs
  // ============================================
  {
    parentPath: '/api/v2/sourcefiles',
    description: 'Source Files (v2)',
    idField: 'sourceFilename',
    alternativeIdFields: ['SourceFile', 'id', 'name', '_id', 'sourcefile'],
    childApis: [
      {
        pathPattern: '/api/v2/sourcefiles/{id}',
        description: 'Get sourcefile details',
        methods: ['GET', 'POST', 'DELETE']
      },
      {
        pathPattern: '/api/v2/sourcefiles/{id}/mappings',
        description: 'Source file mappings',
        methods: ['GET', 'POST', 'DELETE']
      },
      {
        pathPattern: '/api/v2/sourcefiles/{id}/relationships',
        description: 'Source file relationships',
        methods: ['GET', 'POST', 'DELETE']
      },
      {
        pathPattern: '/api/v2/sourcefiles/{id}/audits',
        description: 'Source file audits',
        methods: ['GET', 'POST']
      },
      {
        pathPattern: '/api/v2/sourcefiles/{id}/audit/by/{zone}',
        description: 'Source file audit by zone',
        methods: ['GET']
      },
      {
        pathPattern: '/api/v2/sourcefiles/{id}/audits/{key}',
        description: 'Source file audit by key',
        methods: ['GET']
      },
      // Schedule child APIs (use sourcefile as ID)
      {
        pathPattern: '/api/v2/master/schedule/{id}',
        description: 'Master schedule for sourcefile',
        methods: ['GET', 'POST']
      },
      {
        pathPattern: '/api/v2/schedule/{id}',
        description: 'Schedule for sourcefile',
        methods: ['GET', 'POST']
      },
      {
        pathPattern: '/api/v2/schedule/{id}/type',
        description: 'Schedule type for sourcefile',
        methods: ['GET']
      },
      {
        pathPattern: '/api/v2/schedule/{id}/nextstep',
        description: 'Schedule next step for sourcefile',
        methods: ['GET']
      },
      {
        pathPattern: '/api/v2/schedule/{id}/state',
        description: 'Schedule state for sourcefile',
        methods: ['GET', 'POST']
      },
      {
        pathPattern: '/api/v2/schedule/{id}/processor',
        description: 'Schedule processor for sourcefile',
        methods: ['GET']
      }
    ]
  },
  
  // ============================================
  // SOURCEFILES v3 - Parent with child APIs
  // ============================================
  {
    parentPath: '/api/v3/sourcefiles',
    description: 'Source Files (v3)',
    idField: 'sourceFilename',
    alternativeIdFields: ['id', 'name', '_id', 'sourcefile'],
    childApis: [
      {
        pathPattern: '/api/v3/sourcefiles/{id}',
        description: 'Get sourcefile details (v3)',
        methods: ['GET', 'POST', 'DELETE']
      },
      {
        pathPattern: '/api/v3/sourcefiles/{id}/mappings',
        description: 'Source file mappings (v3)',
        methods: ['GET', 'POST', 'DELETE']
      },
      {
        pathPattern: '/api/v3/sourcefiles/{id}/mappings/groups',
        description: 'Source file mapping groups (v3)',
        methods: ['GET', 'POST']
      },
      {
        pathPattern: '/api/v3/sourcefiles/{id}/relationships',
        description: 'Source file relationships (v3)',
        methods: ['GET', 'POST', 'DELETE']
      },
      {
        pathPattern: '/api/v3/sourcefiles/{id}/audits',
        description: 'Source file audits (v3)',
        methods: ['POST']
      },
      {
        pathPattern: '/api/v3/sourcefiles/{id}/statistics',
        description: 'Source file loading statistics (v3)',
        methods: ['POST']
      }
    ]
  },
  
  // ============================================
  // SOURCEFILES v3.1 - Parent with child APIs
  // ============================================
  {
    parentPath: '/api/v3.1/sourcefiles',
    description: 'Source Files (v3.1)',
    idField: 'sourceFilename',
    alternativeIdFields: ['id', 'name', '_id', 'sourcefile'],
    childApis: [
      {
        pathPattern: '/api/v3.1/sourcefiles/{id}',
        description: 'Get sourcefile details (v3.1)',
        methods: ['GET', 'POST', 'DELETE']
      }
    ]
  },
  
  // ============================================
  // SOURCEFILES v3.2 - Parent with child APIs
  // ============================================
  {
    parentPath: '/api/v3.2/sourcefiles',
    description: 'Source Files (v3.2)',
    idField: 'sourceFilename',
    alternativeIdFields: ['id', 'name', '_id', 'sourcefile'],
    childApis: [
      {
        pathPattern: '/api/v3.2/sourcefiles/{id}',
        description: 'Get sourcefile details (v3.2)',
        methods: ['GET', 'POST', 'PUT', 'DELETE']
      },
      {
        pathPattern: '/api/v3.2/sourcefiles/{id}/mappings',
        description: 'Source file mappings (v3.2)',
        methods: ['GET', 'POST', 'DELETE']
      }
    ]
  },
  
  // ============================================
  // MODEL OBJECTS - Parent with child APIs
  // ============================================
  {
    parentPath: '/api/v2/model',
    description: 'Model Objects (v2)',
    idField: 'object',
    alternativeIdFields: ['name', 'id', 'objectName', '_id'],
    childApis: [
      {
        pathPattern: '/api/v2/model/{id}',
        description: 'Model object details',
        methods: ['GET', 'POST', 'DELETE']
      },
      {
        pathPattern: '/api/v2/model/{id}/attributes',
        description: 'Model object attributes',
        methods: ['GET']
      },
      {
        pathPattern: '/api/v2/model/{id}/attributes/{attr}',
        description: 'Model object specific attribute',
        methods: ['GET', 'POST']
      },
      {
        pathPattern: '/api/v2/model/{id}/relations',
        description: 'Model object relations',
        methods: ['GET', 'POST', 'DELETE']
      }
    ]
  },
  
  // ============================================
  // MODEL OBJECTS v3 - Parent with child APIs
  // ============================================
  {
    parentPath: '/api/v3/model',
    description: 'Model Objects (v3)',
    idField: 'object',
    alternativeIdFields: ['name', 'id', 'objectName', '_id'],
    childApis: [
      {
        pathPattern: '/api/v3/model/{id}',
        description: 'Model object details (v3)',
        methods: ['GET', 'POST']
      },
      {
        pathPattern: '/api/v3/model/loadingpattern/{id}',
        description: 'Model object loading pattern (v3)',
        methods: ['GET', 'POST']
      }
    ]
  }
];

/**
 * Extract resource ID from an API response item
 */
export function extractResourceId(
  item: any, 
  primaryField: string, 
  alternativeFields?: string[]
): string | null {
  // Try primary field first
  if (item[primaryField]) {
    return String(item[primaryField]);
  }
  
  // Try alternative fields
  if (alternativeFields) {
    for (const field of alternativeFields) {
      if (item[field]) {
        return String(item[field]);
      }
    }
  }
  
  // Try common ID fields
  const commonFields = ['id', '_id', 'Id', 'ID', 'name', 'Name'];
  for (const field of commonFields) {
    if (item[field]) {
      return String(item[field]);
    }
  }
  
  return null;
}

/**
 * Find the parent API definition for a given parent path
 */
export function findParentApiDefinition(parentPath: string): ParentApiDefinition | null {
  return HIERARCHICAL_API_DEFINITIONS.find(def => def.parentPath === parentPath) || null;
}

/**
 * Get all child API paths for a given resource ID
 */
export function getChildApiPaths(
  parentDefinition: ParentApiDefinition, 
  resourceId: string
): Array<{ path: string; description: string; methods: string[] }> {
  return parentDefinition.childApis.map(child => ({
    path: child.pathPattern.replace('{id}', resourceId),
    description: child.description,
    methods: child.methods
  }));
}

/**
 * Check if a path is a child API path (contains {id} or similar)
 */
export function isChildApi(path: string): boolean {
  return /\{[^}]+\}/.test(path);
}

/**
 * Find which parent API a child path belongs to
 */
export function findParentForChildPath(childPath: string): ParentApiDefinition | null {
  for (const parentDef of HIERARCHICAL_API_DEFINITIONS) {
    for (const childDef of parentDef.childApis) {
      // Create a regex pattern from the child path pattern
      const pattern = childDef.pathPattern.replace(/\{[^}]+\}/g, '[^/]+');
      const regex = new RegExp(`^${pattern}$`);
      
      if (regex.test(childPath)) {
        return parentDef;
      }
    }
  }
  return null;
}
