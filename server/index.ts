/**
 * File: index.ts
 * Responsibility: Main server entry point that initializes Express app, database, and routes
 * Notes: Sets up the complete server environment with storage, authentication, and API routes
 */
import express from "express";
import ViteExpress from "vite-express";
import cookieParser from "cookie-parser";
import { initializeStorage } from "./storage";
import { initializeDatabase } from "./init-db";
import { registerRoutes } from "./routes";
import * as fs from 'fs';
import * as path from 'path';