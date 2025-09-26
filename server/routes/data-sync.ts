import express from 'express';
import { spawn } from 'child_process';
import { requireRole } from '../replitAuth';
import path from 'path';

const router = express.Router();

// Get lookup data comparison between environments
router.get('/compare/:env1/:env2', requireRole(['super_admin']), async (req, res) => {
  try {
    const { env1, env2 } = req.params;
    
    const scriptPath = path.join(process.cwd(), 'scripts', 'data-sync-manager.ts');
    const child = spawn('tsx', [scriptPath, 'compare', env1, env2], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        // Parse the comparison output
        const lines = stdout.split('\n');
        const comparisons = [];
        let currentTable = null;
        
        for (const line of lines) {
          if (line.includes('📋')) {
            const match = line.match(/📋 (.+):/);
            if (match) {
              currentTable = match[1];
            }
          } else if (line.includes('✅') && currentTable) {
            const match = line.match(/✅ (\d+) rows in both environments/);
            if (match) {
              comparisons.push({
                table: currentTable,
                status: 'identical',
                env1Count: parseInt(match[1]),
                env2Count: parseInt(match[1]),
                difference: 0
              });
            }
          } else if (line.includes('❌') && currentTable) {
            const match = line.match(/❌ .+: (\d+) rows \| .+: (\d+) rows \(diff: (\d+)\)/);
            if (match) {
              comparisons.push({
                table: currentTable,
                status: 'different',
                env1Count: parseInt(match[1]),
                env2Count: parseInt(match[2]),
                difference: parseInt(match[3])
              });
            }
          }
        }

        res.json({
          success: true,
          env1,
          env2,
          comparisons,
          totalTables: comparisons.length,
          identicalTables: comparisons.filter(c => c.status === 'identical').length
        });
      } else {
        res.status(500).json({
          success: false,
          error: stderr || 'Comparison failed',
          stdout
        });
      }
    });

  } catch (error) {
    console.error('Error in data sync comparison:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Export lookup data from environment
router.post('/export/:env', requireRole(['super_admin']), async (req, res) => {
  try {
    const { env } = req.params;
    const { tables } = req.body; // Optional array of specific tables
    
    const scriptPath = path.join(process.cwd(), 'scripts', 'data-sync-manager.ts');
    const args = ['tsx', scriptPath, 'export', env];
    if (tables && tables.length > 0) {
      args.push(...tables);
    }

    const child = spawn(args[0], args.slice(1), {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        // Parse export results
        const exportMatch = stdout.match(/Export completed: (.+)\.json/);
        const tablesMatch = stdout.match(/Tables: (\d+)/);
        const rowsMatch = stdout.match(/Total rows: (\d+)/);
        
        res.json({
          success: true,
          exportName: exportMatch ? exportMatch[1] : null,
          tables: tablesMatch ? parseInt(tablesMatch[1]) : 0,
          totalRows: rowsMatch ? parseInt(rowsMatch[1]) : 0,
          sourceEnvironment: env,
          output: stdout
        });
      } else {
        res.status(500).json({
          success: false,
          error: stderr || 'Export failed',
          stdout
        });
      }
    });

  } catch (error) {
    console.error('Error in data sync export:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Import lookup data to environment
router.post('/import/:env/:exportName', requireRole(['super_admin']), async (req, res) => {
  try {
    const { env, exportName } = req.params;
    const { dryRun, clearFirst, tables } = req.body;
    
    const scriptPath = path.join(process.cwd(), 'scripts', 'data-sync-manager.ts');
    const args = ['tsx', scriptPath, 'import', env, exportName];
    
    if (dryRun) args.push('--dry-run');
    if (clearFirst) args.push('--clear-first');
    if (tables && tables.length > 0) {
      args.push(...tables);
    }

    const child = spawn(args[0], args.slice(1), {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        // Parse import results
        const lines = stdout.split('\n');
        const importedTables = [];
        let totalRows = 0;
        
        for (const line of lines) {
          const match = line.match(/✅ (\d+) rows .* imported/);
          if (match) {
            totalRows += parseInt(match[1]);
          }
          
          const tableMatch = line.match(/📊 Importing (.+) \((\d+) rows\)/);
          if (tableMatch) {
            importedTables.push({
              table: tableMatch[1],
              rows: parseInt(tableMatch[2])
            });
          }
        }
        
        res.json({
          success: true,
          targetEnvironment: env,
          exportName,
          importedTables,
          totalRows,
          dryRun: !!dryRun,
          output: stdout
        });
      } else {
        res.status(500).json({
          success: false,
          error: stderr || 'Import failed',
          stdout
        });
      }
    });

  } catch (error) {
    console.error('Error in data sync import:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// List available exports
router.get('/exports', requireRole(['super_admin']), async (req, res) => {
  try {
    const scriptPath = path.join(process.cwd(), 'scripts', 'data-sync-manager.ts');
    const child = spawn('tsx', [scriptPath, 'list'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        const lines = stdout.split('\n').filter(line => line.trim() && !line.includes('📁 Available exports:'));
        const exports = lines.map(line => line.trim()).filter(line => line.length > 0);
        
        res.json({
          success: true,
          exports
        });
      } else {
        res.status(500).json({
          success: false,
          error: stderr || 'Failed to list exports',
          stdout
        });
      }
    });

  } catch (error) {
    console.error('Error listing exports:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get export information
router.get('/exports/:exportName', requireRole(['super_admin']), async (req, res) => {
  try {
    const { exportName } = req.params;
    
    const scriptPath = path.join(process.cwd(), 'scripts', 'data-sync-manager.ts');
    const child = spawn('tsx', [scriptPath, 'info', exportName], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        // Parse export info
        const lines = stdout.split('\n');
        const sourceMatch = stdout.match(/🔗 Source: (.+)/);
        const createdMatch = stdout.match(/📅 Created: (.+)/);
        const tablesMatch = stdout.match(/📊 Tables: (\d+)/);
        const rowsMatch = stdout.match(/📝 Total rows: (\d+)/);
        
        const tableDetails = [];
        for (const line of lines) {
          const match = line.match(/✅ (.+): (\d+) rows \((.+)\.\.\.\)/);
          if (match) {
            tableDetails.push({
              table: match[1],
              rows: parseInt(match[2]),
              checksum: match[3]
            });
          }
        }
        
        res.json({
          success: true,
          exportName,
          sourceEnvironment: sourceMatch ? sourceMatch[1] : null,
          createdAt: createdMatch ? createdMatch[1] : null,
          totalTables: tablesMatch ? parseInt(tablesMatch[1]) : 0,
          totalRows: rowsMatch ? parseInt(rowsMatch[1]) : 0,
          tableDetails
        });
      } else {
        res.status(500).json({
          success: false,
          error: stderr || 'Failed to get export info',
          stdout
        });
      }
    });

  } catch (error) {
    console.error('Error getting export info:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;