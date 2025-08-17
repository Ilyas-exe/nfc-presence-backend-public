// __tests__/etudiant.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const server = require('../src/server');
const Admin = require('../src/models/Admin');
const Etudiant = require('../src/models/Etudiant');
const Filiere = require('../src/models/Filiere');
const bcrypt = require('bcryptjs');

describe('Etudiant API Routes (Admin Access)', () => {
    let adminToken;
    let testFiliere;

    beforeAll(async () => {
        const password = await bcrypt.hash('etudiant-admin-pass', 10);
        await Admin.create({ nom: 'EtudiantAdmin', email: 'etudiantadmin@example.com', password });
        const res = await request(server).post('/api/auth/login').send({ email: 'etudiantadmin@example.com', password: 'etudiant-admin-pass' });
        adminToken = res.body.token;
        testFiliere = await Filiere.create({ nom: 'Etudiant Test Filiere' });
    });
    
    afterAll(async () => {
        await Admin.deleteMany({});
        await Filiere.deleteMany({});
        await mongoose.connection.close();
        server.close();
    });

    beforeEach(async () => {
        await Etudiant.deleteMany({});
    });

    it('POST /api/etudiants - should allow an admin to create a new etudiant', async () => {
        const res = await request(server)
            .post('/api/etudiants')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                matricule: 'ETU123',
                nom: 'Benali',
                prenom: 'Omar',
                nfc_id: 'NFC_XYZ_123',
                filiere_id: testFiliere._id
            });
        expect(res.statusCode).toEqual(201);
        expect(res.body.data).toHaveProperty('matricule', 'ETU123');
        expect(res.body.data.filiere_id.nom).toBe(testFiliere.nom);
    });

    it('GET /api/etudiants - should get all etudiants', async () => {
        await Etudiant.create({ matricule: 'ETU456', nom: 'Alaoui', prenom: 'Sara', nfc_id: 'NFC_ABC_456', filiere_id: testFiliere._id });
        const res = await request(server)
            .get('/api/etudiants')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.statusCode).toEqual(200);
        expect(res.body.length).toBe(1);
    });
});