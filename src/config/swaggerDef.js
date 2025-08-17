// src/config/swaggerDef.js

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'NFC Presence System API',
    version: '1.0.0',
    description: 'API documentation for the NFC-based student presence tracking system. This API handles management of students, professors, courses, sessions, and attendance marking.',
    contact: {
      name: 'API Support',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000/api',
      description: 'Development Server'
    },
  ],
  components: {
    securitySchemes: {
        bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
        }
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'A human-readable error message.'}
        }
      },
      Filiere: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          nom: { type: 'string', example: 'Génie Informatique - 2GI' }
        }
      },
      Module: {
        type: 'object',
        properties: {
            _id: { type: 'string' },
            titre: { type: 'string', example: 'Développement Web Avancé' },
            filieres_ids: { type: 'array', items: { type: 'string' } }
        }
      },
      Salle: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          nom: { type: 'string', example: 'Amphi Rouge' }
        }
      },
      Etudiant: {
        type: 'object',
        properties: {
            _id: { type: 'string' },
            matricule: { type: 'string', example: 'ETU007' },
            nom: { type: 'string', example: 'Doe' },
            prenom: { type: 'string', example: 'John' },
            nfc_id: { type: 'string', example: 'NFCID98765' },
            photo: { type: 'string', format: 'uri', example: 'http://example.com/photo.jpg' },
            filiere_id: { type: 'string' }
        }
      },
      Professeur: {
        type: 'object',
        properties: {
            _id: { type: 'string' },
            employeeId: { type: 'string', example: 'P007' },
            nom: { type: 'string', example: 'Prof' },
            prenom: { type: 'string', example: 'Test' },
            email: { type: 'string', format: 'email', example: 'prof@example.com' }
        }
      },
       Admin: {
        type: 'object',
        properties: {
            _id: { type: 'string' },
            nom: { type: 'string', example: 'Admin' },
            prenom: { type: 'string', example: 'User' },
            email: { type: 'string', format: 'email', example: 'admin@example.com' }
        }
      },
       Seance: {
        type: 'object',
        properties: {
            _id: { type: 'string' },
            module_id: { type: 'string' },
            professeur_id: { type: 'string' },
            filieres_ids: { type: 'array', items: { type: 'string' } },
            salle_id: { type: 'string' },
            date_seance: { type: 'string', format: 'date' },
            heure_debut: { type: 'string', example: '09:00' },
            heure_fin: { type: 'string', example: '11:00' },
            statut: { type: 'string', enum: ['Planifiée', 'Confirmée', 'Terminée', 'Annulée'] }
        }
      }
    }
  },
  security: [
      {
          bearerAuth: []
      }
  ],
  tags: [
    { name: 'Authentication', description: 'User authentication' },
    { name: 'Admins', description: 'Admin account management (Admin Only)' },
    { name: 'Professeurs', description: 'Professeur account management (Admin Only)' },
    { name: 'Filières', description: 'Filière management (Admin Only)' },
    { name: 'Modules', description: 'Module management' },
    { name: 'Salles', description: 'Salle (Room) management (Admin Only)' },
    { name: 'Etudiants', description: 'Etudiant (Student) record management (Admin Only)' },
    { name: 'Seances', description: 'Seance (Class Session) management (Admin Only)' },
    { name: 'Presences', description: 'Presence tracking and management' },
    { name: 'Uploads', description: 'File upload management' },
    { name: 'Statistics', description: 'System statistics and reporting' }
  ],
  paths: {
    // Authentication
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Authenticate a user (Admin or Professeur)',
        security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', example: 'admin@example.com' }, password: { type: 'string', example: 'admin123' } } } } } },
        responses: { '200': { description: 'Login successful' }, '401': { description: 'Unauthorized' } }
      }
    },
    // Admins
    '/admins': {
      post: {
        tags: ['Admins'],
        summary: 'Create a new admin',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['nom', 'email', 'password'], properties: { nom: { type: 'string' }, prenom: { type: 'string' }, email: { type: 'string' }, password: { type: 'string', minLength: 6 } } } } } },
        responses: { '201': { description: 'Admin created' } }
      },
      get: {
        tags: ['Admins'],
        summary: 'Get all admins',
        responses: { '200': { description: 'List of admins' } }
      }
    },
    '/admins/{id}': {
      get: { tags: ['Admins'], summary: 'Get an admin by ID', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Admin details' } } },
      put: { tags: ['Admins'], summary: 'Update an admin', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { nom: { type: 'string' }, prenom: { type: 'string' }, email: { type: 'string' }, password: { type: 'string', minLength: 6 } } } } } }, responses: { '200': { description: 'Admin updated' } } },
      delete: { tags: ['Admins'], summary: 'Delete an admin', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Admin deleted' }, '400': { description: 'Cannot delete last admin or self.' } } }
    },
    // Professeurs
    '/professeurs': {
        post: { tags: ['Professeurs'], summary: 'Create a new professeur', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['employeeId', 'nom', 'email', 'password'], properties: { employeeId: {type: 'string'}, nom: { type: 'string' }, prenom: { type: 'string' }, email: { type: 'string' }, password: { type: 'string', minLength: 6 } } } } } }, responses: { '201': { description: 'Professeur created' } } },
        get: { tags: ['Professeurs'], summary: 'Get all professeurs', responses: { '200': { description: 'List of professeurs' } } }
    },
    '/professeurs/{id}': {
        get: { tags: ['Professeurs'], summary: 'Get a professeur by ID', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Professeur details' } } },
        put: { tags: ['Professeurs'], summary: 'Update a professeur', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { employeeId: {type: 'string'}, nom: { type: 'string' }, prenom: { type: 'string' }, email: { type: 'string' }, password: { type: 'string', minLength: 6 } } } } } }, responses: { '200': { description: 'Professeur updated' } } },
        delete: { tags: ['Professeurs'], summary: 'Delete a professeur', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Professeur deleted' }, '400': { description: 'Cannot delete professor assigned to seances.' } } }
    },
    // Filières
    '/filieres': {
        post: { tags: ['Filières'], summary: 'Create a new filière', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Filiere' } } } }, responses: { '201': { description: 'Filière created' } } },
        get: { tags: ['Filières'], summary: 'Get all filières', responses: { '200': { description: 'List of filières' } } }
    },
    '/filieres/{id}': {
        get: { tags: ['Filières'], summary: 'Get a filière by ID', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Filière details' } } },
        put: { tags: ['Filières'], summary: 'Update a filière', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Filiere' } } } }, responses: { '200': { description: 'Filière updated' } } },
        delete: { tags: ['Filières'], summary: 'Delete a filière', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Filière deleted' } } }
    },
    // Modules
    '/modules': {
        post: { tags: ['Modules'], summary: 'Create a new module', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Module' } } } }, responses: { '201': { description: 'Module created' } } },
        get: { tags: ['Modules'], summary: 'Get all modules', responses: { '200': { description: 'List of modules' } } }
    },
    '/modules/{id}': {
        get: { tags: ['Modules'], summary: 'Get a module by ID', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Module details' } } },
        put: { tags: ['Modules'], summary: 'Update a module', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Module' } } } }, responses: { '200': { description: 'Module updated' } } },
        delete: { tags: ['Modules'], summary: 'Delete a module', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Module deleted' }, '400': { description: 'Cannot delete module assigned to seances.' } } }
    },
    // Salles
    '/salles': {
        post: { tags: ['Salles'], summary: 'Create a new salle', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Salle' } } } }, responses: { '201': { description: 'Salle created' } } },
        get: { tags: ['Salles'], summary: 'Get all salles', responses: { '200': { description: 'List of salles' } } }
    },
    '/salles/{id}': {
        get: { tags: ['Salles'], summary: 'Get a salle by ID', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Salle details' } } },
        put: { tags: ['Salles'], summary: 'Update a salle', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Salle' } } } }, responses: { '200': { description: 'Salle updated' } } },
        delete: { tags: ['Salles'], summary: 'Delete a salle', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Salle deleted' }, '400': { description: 'Cannot delete salle assigned to seances.' } } }
    },
    // Etudiants
    '/etudiants': {
        post: { tags: ['Etudiants'], summary: 'Create a new etudiant', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Etudiant' } } } }, responses: { '201': { description: 'Etudiant created' } } },
        get: { tags: ['Etudiants'], summary: 'Get all etudiants', responses: { '200': { description: 'List of etudiants' } } }
    },
    '/etudiants/{id}': {
        get: { tags: ['Etudiants'], summary: 'Get an etudiant by ID', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Etudiant details' } } },
        put: { tags: ['Etudiants'], summary: 'Update an etudiant', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Etudiant' } } } }, responses: { '200': { description: 'Etudiant updated' } } },
        delete: { tags: ['Etudiants'], summary: 'Delete an etudiant', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Etudiant deleted' }, '400': { description: 'Cannot delete etudiant with presence records.' } } }
    },
    // Seances
    '/seances': {
        post: { tags: ['Seances'], summary: 'Create a new seance', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Seance' } } } }, responses: { '201': { description: 'Seance created' }, '400': { description: 'Clash detected or invalid IDs.'} } },
        get: { tags: ['Seances'], summary: 'Get all seances', responses: { '200': { description: 'List of seances' } } }
    },
    '/seances/{id}': {
        get: { tags: ['Seances'], summary: 'Get a seance by ID', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Seance details' } } },
        put: { tags: ['Seances'], summary: 'Update a seance', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Seance' } } } }, responses: { '200': { description: 'Seance updated' } } },
        delete: { tags: ['Seances'], summary: 'Delete or cancel a seance', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Seance deleted or cancelled' } } }
    },
     // Presences
    '/presences/scan': {
        post: { tags: ['Presences'], summary: 'Mark presence via NFC scan', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['nfc_id', 'seance_id'], properties: { nfc_id: { type: 'string' }, seance_id: { type: 'string' } } } } } }, responses: { '201': { description: 'Presence marked and pending approval.' } } }
    },
    '/presences/seance/{seanceId}': {
        get: { tags: ['Presences'], summary: "Get attendance list for a seance", parameters: [{ name: 'seanceId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: "Full attendance details." } } }
    },
    '/presences/{presenceId}/approve': {
        put: { tags: ['Presences'], summary: "Approve or reject a pending presence", parameters: [{ name: 'presenceId', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['statut_approbation'], properties: { statut_approbation: { type: 'string', enum: ['Approuvé', 'Rejeté'] } } } } } }, responses: { '200': { description: "Presence status updated." } } }
    },
    '/presences/professeur/pending': {
      get: { tags: ['Presences'], summary: "Get professor's pending presences", responses: { '200': { description: "List of pending presences for the logged-in professor." } } }
    },
     // Uploads
    '/uploads/etudiant/{etudiantId}/photo': {
      post: {
        tags: ['Uploads'],
        summary: "Upload a student's photo",
        parameters: [{ name: 'etudiantId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', properties: { etudiantPhoto: { type: 'string', format: 'binary' } } } } } },
        responses: { '200': { description: 'Photo uploaded successfully.' } }
      }
    },
    // Statistics
    '/stats/admin/overview': {
        get: { tags: ['Statistics'], summary: "Get admin system overview", responses: { '200': { description: "System-wide statistics." } } }
    },
    '/stats/professeur/{professeurId}/attendance-summary': {
        get: { tags: ['Statistics'], summary: "Get professor's attendance summary", parameters: [{ name: 'professeurId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: "Professor's attendance statistics." } } }
    },
    '/stats/module/{moduleId}/attendance-summary': {
        get: { tags: ['Statistics'], summary: "Get module's attendance summary", parameters: [{ name: 'moduleId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: "Module's attendance statistics." } } }
    },
    '/stats/etudiant/{etudiantId}/attendance-summary': {
        get: { tags: ['Statistics'], summary: "Get student's attendance summary", parameters: [{ name: 'etudiantId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: "Student's attendance statistics." } } }
    }
  }
};

module.exports = swaggerDefinition;
