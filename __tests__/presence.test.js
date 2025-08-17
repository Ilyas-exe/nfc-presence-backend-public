// __tests__/presence.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const server = require('../src/server');
const Admin = require('../src/models/Admin');
const Professeur = require('../src/models/Professeur');
const Etudiant = require('../src/models/Etudiant');
const Seance = require('../src/models/Seance');
const Filiere = require('../src/models/Filiere');
const Module = require('../src/models/Module');
const Salle = require('../src/models/Salle');
const Presence = require('../src/models/Presence');
const bcrypt = require('bcryptjs');

describe('Presence API Routes', () => {
    let adminToken, profToken;
    let testProf, testEtudiant, testSeance;

    beforeAll(async () => {
        // Setup Users
        const adminPassword = await bcrypt.hash('presence-admin-pass', 10);
        await Admin.create({ nom: 'PresenceAdmin', email: 'presenceadmin@example.com', password: adminPassword });
        const adminRes = await request(server).post('/api/auth/login').send({ email: 'presenceadmin@example.com', password: 'presence-admin-pass' });
        adminToken = adminRes.body.token;

        const profPassword = await bcrypt.hash('presence-prof-pass', 10);
        testProf = await Professeur.create({ employeeId: 'PPRESENCE', nom: 'PresenceProf', email: 'presenceprof@example.com', password: profPassword });
        const profRes = await request(server).post('/api/auth/login').send({ email: 'presenceprof@example.com', password: 'presence-prof-pass' });
        profToken = profRes.body.token;

        // Setup Data
        const filiere = await Filiere.create({ nom: 'Presence Test Filiere' });
        const module = await Module.create({ titre: 'Presence Test Module', filieres_ids: [filiere._id] });
        const salle = await Salle.create({ nom: 'Presence Test Salle' });
        testEtudiant = await Etudiant.create({ matricule: 'ETUPRESENCE', nom: 'Student', prenom: 'Test', nfc_id: 'NFC_PRESENCE_TEST', filiere_id: filiere._id });
        testSeance = await Seance.create({ module_id: module._id, professeur_id: testProf._id, filieres_ids: [filiere._id], salle_id: salle._id, date_seance: new Date(), heure_debut: '14:00', heure_fin: '16:00', statut: 'Confirmée' });
    });

    afterAll(async () => {
        await Admin.deleteMany({});
        await Professeur.deleteMany({});
        await Etudiant.deleteMany({});
        await Seance.deleteMany({});
        await Filiere.deleteMany({});
        await Module.deleteMany({});
        await Salle.deleteMany({});
        await mongoose.connection.close();
        server.close();
    });

    beforeEach(async () => {
        await Presence.deleteMany({});
    });

    it('POST /api/presences/scan - should create a pending presence record on first scan', async () => {
        const res = await request(server)
            .post('/api/presences/scan')
            .set('Authorization', `Bearer ${profToken}`) // The device could be logged in as the prof
            .send({
                nfc_id: testEtudiant.nfc_id,
                seance_id: testSeance._id
            });
        
        expect(res.statusCode).toEqual(201);
        expect(res.body.data.statut_approbation).toBe('En attente');
        expect(res.body.data.etudiant_id.matricule).toBe(testEtudiant.matricule);
    });

    it('PUT /api/presences/:presenceId/approve - should allow the correct professor to approve a presence', async () => {
        const presence = await Presence.create({ etudiant_id: testEtudiant._id, seance_id: testSeance._id });
        
        const res = await request(server)
            .put(`/api/presences/${presence._id}/approve`)
            .set('Authorization', `Bearer ${profToken}`)
            .send({ statut_approbation: 'Approuvé' });

        expect(res.statusCode).toEqual(200);
        expect(res.body.data.statut_approbation).toBe('Approuvé');
        expect(res.body.data.approved_by_id.nom).toBe(testProf.nom);
    });
});