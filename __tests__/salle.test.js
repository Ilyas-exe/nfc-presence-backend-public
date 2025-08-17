// __tests__/salle.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const server = require('../src/server');
const Admin = require('../src/models/Admin');
const Salle = require('../src/models/Salle');
const bcrypt = require('bcryptjs');

describe('Salle API Routes (Admin Access)', () => {
    let adminToken;

    beforeAll(async () => {
        const password = await bcrypt.hash('salle-admin-pass', 10);
        await Admin.create({ nom: 'SalleAdmin', email: 'salleadmin@example.com', password });
        const res = await request(server).post('/api/auth/login').send({ email: 'salleadmin@example.com', password: 'salle-admin-pass' });
        adminToken = res.body.token;
    });

    afterAll(async () => {
        await Admin.deleteMany({});
        await mongoose.connection.close();
        server.close();
    });

    beforeEach(async () => {
        await Salle.deleteMany({});
    });

    it('POST /api/salles - should allow an admin to create a new salle', async () => {
        const res = await request(server)
            .post('/api/salles')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ nom: 'Amphi C' });
        expect(res.statusCode).toEqual(201);
        expect(res.body.data).toHaveProperty('nom', 'Amphi C');
    });

    it('GET /api/salles - should allow an admin to get all salles', async () => {
        await Salle.create({ nom: 'Salle 101' });
        const res = await request(server)
            .get('/api/salles')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).toEqual(200);
        expect(res.body.length).toBe(1);
        expect(res.body[0].nom).toBe('Salle 101');
    });

    it('PUT /api/salles/:id - should allow an admin to update a salle', async () => {
        const salle = await Salle.create({ nom: 'Old Salle Name' });
        const res = await request(server)
            .put(`/api/salles/${salle._id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ nom: 'New Salle Name' });
        expect(res.statusCode).toEqual(200);
        expect(res.body.data.nom).toBe('New Salle Name');
    });

    it('DELETE /api/salles/:id - should allow an admin to delete a salle', async () => {
        const salle = await Salle.create({ nom: 'Salle To Delete' });
        const res = await request(server)
            .delete(`/api/salles/${salle._id}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).toEqual(200);
        const findRes = await Salle.findById(salle._id);
        expect(findRes).toBeNull();
    });
});