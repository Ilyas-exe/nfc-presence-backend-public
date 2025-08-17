// __tests__/professeur.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const server = require('../src/server');
const Admin = require('../src/models/Admin');
const Professeur = require('../src/models/Professeur');
const bcrypt = require('bcryptjs');

describe('Professeur API Routes (Admin Access)', () => {
  let adminToken;

  // Runs ONCE before all tests
  beforeAll(async () => {
    // Create a temporary admin user for all tests in this suite
    const password = await bcrypt.hash('superadmin123', 10);
    await Admin.create({ nom: 'Super', prenom: 'Admin', email: 'superadmin@example.com', password: password });

    // Log in as the admin to get a token
    const res = await request(server).post('/api/auth/login').send({ email: 'superadmin@example.com', password: 'superadmin123' });
    adminToken = res.body.token;
  });

  // Runs ONCE after all tests
  afterAll(async () => {
    await mongoose.connection.close();
    server.close();
  });

  // Runs BEFORE EACH test to ensure a clean state
  beforeEach(async () => {
    await Professeur.deleteMany({});
  });

  // --- Test Suite for POST /api/professeurs ---
  describe('POST /api/professeurs', () => {
    it('should allow an admin to create a new professeur', async () => {
      const res = await request(server)
        .post('/api/professeurs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          employeeId: 'P001',
          nom: 'El Fihri',
          prenom: 'Fatima',
          email: 'fatima.elfihri@example.com',
          password: 'password123'
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.data).toHaveProperty('employeeId', 'P001');
      expect(res.body.data.email).toBe('fatima.elfihri@example.com');
      // IMPORTANT: Ensure password is NOT returned
      expect(res.body.data.password).toBeUndefined();

      // Check the database to ensure password was hashed
      const newProf = await Professeur.findById(res.body.data._id);
      expect(newProf).not.toBeNull();
      const isMatch = await bcrypt.compare('password123', newProf.password);
      expect(isMatch).toBe(true);
    });

    it('should return 400 if email is already used by another professeur', async () => {
        await request(server).post('/api/professeurs').set('Authorization', `Bearer ${adminToken}`).send({ employeeId: 'P001', nom: 'First', prenom: 'Prof', email: 'duplicate@example.com', password: 'password123' });

        const res = await request(server).post('/api/professeurs').set('Authorization', `Bearer ${adminToken}`).send({ employeeId: 'P002', nom: 'Second', prenom: 'Prof', email: 'duplicate@example.com', password: 'password123' });

        expect(res.statusCode).toEqual(400);
        expect(res.body.errors[0].msg).toBe('Un professeur avec cet email existe déjà.');
    });

    it('should return 400 if email is already used by an admin', async () => {
        const res = await request(server).post('/api/professeurs').set('Authorization', `Bearer ${adminToken}`).send({ employeeId: 'P003', nom: 'Third', prenom: 'Prof', email: 'superadmin@example.com', password: 'password123' });
        expect(res.statusCode).toEqual(400);
        expect(res.body.errors[0].msg).toBe('Un administrateur avec cet email existe déjà.');
    });

    it('should return 400 if employeeId is already used', async () => {
        await request(server).post('/api/professeurs').set('Authorization', `Bearer ${adminToken}`).send({ employeeId: 'P-DUPLICATE', nom: 'First', prenom: 'Prof', email: 'first@example.com', password: 'password123' });

        const res = await request(server).post('/api/professeurs').set('Authorization', `Bearer ${adminToken}`).send({ employeeId: 'P-DUPLICATE', nom: 'Second', prenom: 'Prof', email: 'second@example.com', password: 'password123' });
        
        expect(res.statusCode).toEqual(400);
        expect(res.body.errors[0].msg).toBe('Un professeur avec cet ID employé existe déjà.');
    });
  });

  // --- Test Suite for GET /api/professeurs ---
  describe('GET /api/professeurs', () => {
    it('should return a list of all professeurs without their passwords', async () => {
        await Professeur.create({ employeeId: 'P1', nom: 'ProfA', email: 'profa@example.com', password: 'hashedpass' });
        await Professeur.create({ employeeId: 'P2', nom: 'ProfB', email: 'profb@example.com', password: 'hashedpass' });

        const res = await request(server)
            .get('/api/professeurs')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.length).toBe(2);
        expect(res.body[0].password).toBeUndefined();
        expect(res.body[1].password).toBeUndefined();
    });
  });

  // --- Test Suite for PUT /api/professeurs/:id ---
  describe('PUT /api/professeurs/:id', () => {
    it('should allow an admin to update a professor\'s details', async () => {
        const prof = await Professeur.create({ employeeId: 'P-UPDATE', nom: 'OldName', email: 'oldemail@example.com', password: 'oldpass' });
        
        const res = await request(server)
            .put(`/api/professeurs/${prof._id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ nom: 'NewName', email: 'newemail@example.com' });

        expect(res.statusCode).toEqual(200);
        expect(res.body.data.nom).toBe('NewName');
        expect(res.body.data.email).toBe('newemail@example.com');
    });
  });

  // --- Test Suite for DELETE /api/professeurs/:id ---
  describe('DELETE /api/professeurs/:id', () => {
    it('should allow an admin to delete a professor', async () => {
        const prof = await Professeur.create({ employeeId: 'P-DELETE', nom: 'ToDelete', email: 'todelete@example.com', password: 'pass' });

        const res = await request(server)
            .delete(`/api/professeurs/${prof._id}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.message).toBe('Professeur supprimé avec succès');
    });
  });
});