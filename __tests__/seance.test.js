// __tests__/seance.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const server = require('../src/server');
const Admin = require('../src/models/Admin');
const Professeur = require('../src/models/Professeur');
const Module = require('../src/models/Module');
const Filiere = require('../src/models/Filiere');
const Salle = require('../src/models/Salle');
const Seance = require('../src/models/Seance');
const bcrypt = require('bcryptjs');

describe('Seance API Routes (Admin Access)', () => {
    let adminToken;
    let testProf, testModule, testFiliere, testSalle;

    beforeAll(async () => {
        const adminPassword = await bcrypt.hash('seance-admin-pass', 10);
        await Admin.create({ nom: 'SeanceAdmin', email: 'seanceadmin@example.com', password: adminPassword });
        const res = await request(server).post('/api/auth/login').send({ email: 'seanceadmin@example.com', password: 'seance-admin-pass' });
        adminToken = res.body.token;

        const profPassword = await bcrypt.hash('seance-prof-pass', 10);
        testProf = await Professeur.create({ employeeId: 'PSEANCE', nom: 'SeanceProf', email: 'seanceprof@example.com', password: profPassword });
        
        testFiliere = await Filiere.create({ nom: 'Seance Test Filiere' });
        testModule = await Module.create({ titre: 'Seance Test Module', filieres_ids: [testFiliere._id] });
        testSalle = await Salle.create({ nom: 'Seance Test Salle' });
    });

    afterAll(async () => {
        await Admin.deleteMany({});
        await Professeur.deleteMany({});
        await Module.deleteMany({});
        await Filiere.deleteMany({});
        await Salle.deleteMany({});
        await mongoose.connection.close();
        server.close();
    });

    beforeEach(async () => {
        await Seance.deleteMany({});
    });

    it('POST /api/seances - should allow an admin to create a seance', async () => {
        const res = await request(server)
            .post('/api/seances')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                module_id: testModule._id,
                professeur_id: testProf._id,
                filieres_ids: [testFiliere._id],
                salle_id: testSalle._id,
                date_seance: '2025-10-20',
                heure_debut: '09:00',
                heure_fin: '11:00'
            });
        expect(res.statusCode).toEqual(201);
        expect(res.body.data.module_id.titre).toBe('Seance Test Module');
    });
    
    it('POST /api/seances - should prevent creating a clashing seance for a professor', async () => {
        // Create the first seance
        await request(server).post('/api/seances').set('Authorization', `Bearer ${adminToken}`).send({ module_id: testModule._id, professeur_id: testProf._id, filieres_ids: [testFiliere._id], salle_id: testSalle._id, date_seance: '2025-10-21', heure_debut: '09:00', heure_fin: '11:00' });
        
        // Attempt to create an overlapping seance
        const otherSalle = await Salle.create({ nom: 'Another Room' });
        const res = await request(server)
            .post('/api/seances')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                module_id: testModule._id,
                professeur_id: testProf._id, // Same professor
                filieres_ids: [testFiliere._id],
                salle_id: otherSalle._id, // Different room
                date_seance: '2025-10-21', // Same date
                heure_debut: '10:00', // Overlapping time
                heure_fin: '12:00'
            });

        expect(res.statusCode).toEqual(400);
        expect(res.body.errors[0].msg).toContain('Ce professeur est déjà assigné');
    });
});