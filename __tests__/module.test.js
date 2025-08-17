// __tests__/module.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const server = require('../src/server'); // Import the server instance
const Admin = require('../src/models/Admin');
const Professeur = require('../src/models/Professeur'); // We might need a prof token for read access tests
const Module = require('../src/models/Module');
const Filiere = require('../src/models/Filiere');
const bcrypt = require('bcryptjs');

describe('Module API Routes', () => {
  let adminToken;
  let profToken;
  let testFiliere1;
  let testFiliere2;

  // Runs ONCE before all tests
  beforeAll(async () => {
    // Create a temporary admin user
    const adminPassword = await bcrypt.hash('password123', 10);
    await Admin.create({ nom: 'Test', prenom: 'Admin', email: 'moduletestadmin@example.com', password: adminPassword });    
    // Create a temporary professor user
    const profPassword = await bcrypt.hash('password123', 10);
    await Professeur.create({ employeeId: 'PTEST', nom: 'Test', prenom: 'Prof', email: 'moduletestprof@example.com', password: profPassword });

    // Log in as both users to get tokens
    const adminRes = await request(server).post('/api/auth/login').send({ email: 'moduletestadmin@example.com', password: 'password123' });
    adminToken = adminRes.body.token;

    const profRes = await request(server).post('/api/auth/login').send({ email: 'moduletestprof@example.com', password: 'password123' });
    profToken = profRes.body.token;

    // Create some filieres to use in tests
    testFiliere1 = await Filiere.create({ nom: 'Module Test Filiere 1' });
    testFiliere2 = await Filiere.create({ nom: 'Module Test Filiere 2' });
  });

  // Runs ONCE after all tests
  afterAll(async () => {
    // Clean up all collections used in this test suite
    await Admin.deleteMany({});
    await Professeur.deleteMany({});
    await Module.deleteMany({});
    await Filiere.deleteMany({});
    await mongoose.connection.close();
    server.close();
  });
  
  // Runs BEFORE EACH test
  beforeEach(async () => {
      // Clean the module collection before each test to ensure isolation
      await Module.deleteMany({});
  });


  // --- Test Suite for POST /api/modules ---
  describe('POST /api/modules', () => {
    it('should return 401 Unauthorized if no token is provided', async () => {
        const res = await request(server).post('/api/modules').send({ titre: 'Unauthorized Module' });
        expect(res.statusCode).toEqual(401);
    });

    it('should return 403 Forbidden if a non-admin (e.g., professor) tries to create a module', async () => {
        const res = await request(server)
            .post('/api/modules')
            .set('Authorization', `Bearer ${profToken}`)
            .send({ titre: 'Prof Module Attempt' });
        expect(res.statusCode).toEqual(403);
    });

    it('should allow an admin to create a new module and link it to existing filieres', async () => {
        const res = await request(server)
            .post('/api/modules')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ 
                titre: 'Advanced Algorithms', 
                filieres_ids: [testFiliere1._id, testFiliere2._id] 
            });
        
        expect(res.statusCode).toEqual(201);
        expect(res.body.data).toHaveProperty('titre', 'Advanced Algorithms');
        expect(res.body.data.filieres_ids).toEqual(
            expect.arrayContaining([testFiliere1._id.toString(), testFiliere2._id.toString()])
        );

        const savedModule = await Module.findById(res.body.data._id);
        expect(savedModule.titre).toBe('Advanced Algorithms');
    });

    it('should return 400 Bad Request if trying to link a non-existent filiere', async () => {
        const nonExistentFiliereId = new mongoose.Types.ObjectId();
        const res = await request(server)
            .post('/api/modules')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ 
                titre: 'Module with Bad Filiere', 
                filieres_ids: [nonExistentFiliereId] 
            });

        expect(res.statusCode).toEqual(400);
        expect(res.body.errors[0].msg).toContain("n'existe pas");
    });
  });

  // --- Test Suite for GET /api/modules ---
  describe('GET /api/modules', () => {
      it('should allow any authenticated user (e.g., professor) to get all modules', async () => {
        await Module.create({ titre: 'Module One', filieres_ids: [testFiliere1._id] });
        await Module.create({ titre: 'Module Two', filieres_ids: [testFiliere2._id] });
        
        const res = await request(server)
            .get('/api/modules')
            .set('Authorization', `Bearer ${profToken}`);
        
        expect(res.statusCode).toEqual(200);
        expect(res.body.length).toBe(2);
        // Check if filiere is populated with its name
        expect(res.body[0].filieres_ids[0]).toHaveProperty('nom', testFiliere1.nom);
      });
  });

    // --- Test Suite for PUT /api/modules/:id ---
    describe('PUT /api/modules/:id', () => {
        it('should allow an admin to update a module', async () => {
            const module = await Module.create({ titre: 'Initial Titre', filieres_ids: [testFiliere1._id] });
            
            const res = await request(server)
                .put(`/api/modules/${module._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    titre: 'Updated Titre',
                    filieres_ids: [testFiliere2._id] // Change the filiere
                });

            expect(res.statusCode).toEqual(200);
            expect(res.body.data.titre).toBe('Updated Titre');
            expect(res.body.data.filieres_ids[0].nom).toBe(testFiliere2.nom);
        });
    });

    // --- Test Suite for DELETE /api/modules/:id ---
    describe('DELETE /api/modules/:id', () => {
        it('should allow an admin to delete a module', async () => {
            const module = await Module.create({ titre: 'To Be Deleted' });
            
            const res = await request(server)
                .delete(`/api/modules/${module._id}`)
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect(res.statusCode).toEqual(200);
            expect(res.body.message).toBe('Module supprimé avec succès');
            
            const deletedModule = await Module.findById(module._id);
            expect(deletedModule).toBeNull();
        });
    });

});