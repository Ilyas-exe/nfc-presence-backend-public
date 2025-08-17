// __tests__/filiere.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const server = require('../src/server'); 
const Admin = require('../src/models/Admin');
const Filiere = require('../src/models/Filiere');
const bcrypt = require('bcryptjs');

describe('Filiere API Routes', () => {
  let adminToken;

  // Runs ONCE before all tests
  beforeAll(async () => {
    const password = await bcrypt.hash('password123', 10);
    await Admin.create({
      nom: 'Test',
      prenom: 'Admin',
      email: 'testadmin@example.com',
      password: password,
    });
    const res = await request(server)
      .post('/api/auth/login')
      .send({
        email: 'testadmin@example.com',
        password: 'password123',
      });
    adminToken = res.body.token;
  });

  // Runs ONCE after all tests
  afterAll(async () => {
    await mongoose.connection.close();
    server.close();
  });

  // Runs BEFORE EACH test
  beforeEach(async () => {
    await Admin.deleteMany({}); // Keep the Admin user for all tests
    await Filiere.deleteMany({});
    
    // Re-create and log in the admin before each test to ensure a clean state and valid token
    const password = await bcrypt.hash('password123', 10);
    await Admin.create({
      nom: 'Test',
      prenom: 'Admin',
      email: 'testadmin@example.com',
      password: password,
    });
    const res = await request(server)
      .post('/api/auth/login')
      .send({
        email: 'testadmin@example.com',
        password: 'password123',
      });
    adminToken = res.body.token;
  });
  
  // --- Test Suite for GET /api/filieres ---
  describe('GET /api/filieres', () => {
    it('should return 401 Unauthorized if no token is provided', async () => {
      const res = await request(server).get('/api/filieres');
      expect(res.statusCode).toEqual(401);
    });

    it('should return 200 OK and a list of filieres if an admin token is provided', async () => {
      await Filiere.create({ nom: 'Test Filiere' });
      const res = await request(server)
        .get('/api/filieres')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0]).toHaveProperty('nom', 'Test Filiere');
    });
  });

  // --- Test Suite for GET /api/filieres/:id ---
  describe('GET /api/filieres/:id', () => {
    it('should return a single filiere if a valid ID is provided', async () => {
        const filiere = await Filiere.create({ nom: 'Single Filiere' });
        const res = await request(server)
            .get(`/api/filieres/${filiere._id}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('nom', 'Single Filiere');
    });

    it('should return 404 Not Found if the filiere does not exist', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const res = await request(server)
            .get(`/api/filieres/${nonExistentId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toEqual(404);
    });
  });

  // --- Test Suite for POST /api/filieres ---
  describe('POST /api/filieres', () => {
    it('should allow an admin to create a new filiere', async () => {
      const res = await request(server)
        .post('/api/filieres')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nom: 'Génie Mécanique - 1GM' });

      expect(res.statusCode).toEqual(201);
      expect(res.body.data).toHaveProperty('nom', 'Génie Mécanique - 1GM');
    });

     it('should return 400 Bad Request if the filiere name already exists', async () => {
        await Filiere.create({ nom: 'Génie Existant' });
        const res = await request(server)
            .post('/api/filieres')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ nom: 'Génie Existant' });

        expect(res.statusCode).toEqual(400);
    });
  });

  // --- Test Suite for PUT /api/filieres/:id ---
  describe('PUT /api/filieres/:id', () => {
      it('should allow an admin to update an existing filiere', async () => {
          const filiere = await Filiere.create({ nom: 'Old Name' });
          const res = await request(server)
            .put(`/api/filieres/${filiere._id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ nom: 'New Updated Name' });

          expect(res.statusCode).toEqual(200);
          expect(res.body.data).toHaveProperty('nom', 'New Updated Name');

          const updatedFiliere = await Filiere.findById(filiere._id);
          expect(updatedFiliere.nom).toBe('New Updated Name');
      });
  });

  // --- Test Suite for DELETE /api/filieres/:id ---
  describe('DELETE /api/filieres/:id', () => {
      it('should allow an admin to delete an existing filiere', async () => {
          const filiere = await Filiere.create({ nom: 'To Be Deleted' });
          const res = await request(server)
            .delete(`/api/filieres/${filiere._id}`)
            .set('Authorization', `Bearer ${adminToken}`);

          expect(res.statusCode).toEqual(200);
          expect(res.body).toHaveProperty('message', 'Filière supprimée avec succès');

          const deletedFiliere = await Filiere.findById(filiere._id);
          expect(deletedFiliere).toBeNull();
      });
  });
});