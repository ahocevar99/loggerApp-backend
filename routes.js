import express from "express";
import crypto from 'crypto';
import Project from "./models/Project.js";
import Log from "./models/Log.js";
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { z } from "zod";
import { auth } from 'express-oauth2-jwt-bearer';

dotenv.config();

const router = express.Router();

const jwtCheck = auth({
    audience: 'https://logerApp/api',
    issuerBaseURL: 'https://dev-agqben5gv63e31ra.us.auth0.com/',
    tokenSigningAlg: 'RS256'
});

const logSchema = z.object({
    apiKey: z.string(),
    message: z.string(),
    severity_level: z.string()
});

router.post("/api/log", async (req, res) => {
    const parseResult = logSchema.safeParse(req.body);

    if (!parseResult.success) {
        return res.status(400).json({
            message: "Neveljavna struktura JSON",
            errors: parseResult.error.errors
        });
    }

    const { apiKey, message, severity_level } = parseResult.data;
    const origin = req.get('origin') || req.headers.origin;

    if (!origin) {
        return res.status(400).json({ message: "Ni bilo mogoče prebrati izvornega URL-ja iz zahteve" });
    }

    try {
        const project = await Project.findOne({ apiKey });
        if (!project) {
            return res.status(403).json({ message: "Neveljaven API ključ" });
        }

        if (!project.projectOrigins.includes(origin)) {
            return res.status(403).json({ message: "Izvorni URL ni dovoljen za ta projekt" });
        }

        const log = new Log({
            project: project._id,
            message,
            severity_level,
        });

        await log.save();

        res.status(201).json({ message: "Log shranjen uspešno" });

    } catch (error) {
        console.error("Napaka pri shranjevanju loga:", error);
        res.status(500).json({ message: "Napaka na strežniku" });
    }
});



// ✅ ZAŠČITENE ROUTE Z JWT

router.post("/api/addProject", jwtCheck, async (req, res) => {
    const { name, origins } = req.body;
    const apiKey = crypto.randomBytes(16).toString('hex');

    const userId = req.auth?.payload.sub;
    const username = req.auth?.payload['https://my-app.com/username'];
    const email = req.auth?.payload['https://my-app.com/email'];

    const project = new Project({
        projectName: name,
        projectOrigins: origins,
        ownerId: userId,
        ownerUsername: username,
        ownerEmail: email,
        apiKey: apiKey,
    });

    try {
        await project.save();
        res.status(201).json({ message: "Project saved", apiKey });
    } catch (error) {
        console.error("Error saving project", error);
        res.status(500).json({ message: "Server error" });
    }
});

router.get("/api/myProjects", jwtCheck, async (req, res) => {
    try {
        const userId = req.auth?.payload.sub;
        const projects = await Project.find({ ownerId: userId }).sort({ createdAt: -1 });
        res.json(projects);
    } catch (error) {
        console.error("Error fetching projects", error);
        res.status(500).json({ message: "Server error" });
    }
});

router.get("/api/allProjects", jwtCheck, async (req, res) => {
    try {
        const projects = await Project.find().sort({ createdAt: -1 });
        res.json(projects);
    } catch (error) {
        console.error("Error fetching projects", error);
        res.status(500).json({ message: "Server error" });
    }
});


router.get("/api/myLogs", jwtCheck, async (req, res) => {
    try {
        const userId = req.auth?.payload.sub;
        const projects = await Project.find({ ownerId: userId });

        const projectIds = projects.map(p => p._id);

        const logs = await Log.find({ project: { $in: projectIds } })
            .populate('project', 'projectName')
            .sort({ createdAt: -1 });


        res.json(logs);
    } catch (error) {
        console.error("Napaka pri pridobivanju logov:", error);
        res.status(500).json({ message: "Napaka na strežniku" });
    }
});

router.get("/api/allLogs", jwtCheck, async (req, res) => {
    try {
        
        const projects = await Project.find();

        const projectIds = projects.map(p => p._id);

        const logs = await Log.find({ project: { $in: projectIds } })
            .populate('project', 'projectName')
            .sort({ createdAt: -1 });


        res.json(logs);
    } catch (error) {
        console.error("Napaka pri pridobivanju logov:", error);
        res.status(500).json({ message: "Napaka na strežniku" });
    }
});



// ✅ Dovoljena tudi brez JWT — lahko dodaš zaščito po potrebi
router.post("/api/addUser", async (req, res) => {
    const { email, username, password } = req.body;

    try {
        const tokenRes = await fetch(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: process.env.AUTH0_CLIENT_ID,
                client_secret: process.env.AUTH0_CLIENT_SECRET,
                audience: process.env.AUTH0_MANAGEMENT_API_AUDIENCE,
                grant_type: 'client_credentials',
            }),
        });

        const tokenJson = await tokenRes.json();

        if (!tokenRes.ok) {
            return res.status(tokenRes.status).json({ message: 'Failed to get access token', details: tokenJson });
        }

        const access_token = tokenJson.access_token;
        if (!access_token) {
            return res.status(500).json({ message: 'No access token received from Auth0' });
        }

        const userRes = await fetch(`https://${process.env.AUTH0_DOMAIN}/api/v2/users`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                username,
                password,
                connection: 'Username-Password-Authentication',
                email_verified: false,
            }),
        });

        const newUser = await userRes.json();

        if (!userRes.ok) {
            return res.status(userRes.status).json({ message: 'Napaka pri dodajanju uporabnika. Preveri podatke.', details: newUser });
        }

        res.status(201).json({ message: 'Uporabnik uspešno dodan', user: newUser });

    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Server error while creating user' });
    }
});

export default router;
