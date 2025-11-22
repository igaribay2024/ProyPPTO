// Universal CRUD API for all resources
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { resource } = req.query;
  
  if (!resource) {
    return res.status(400).json({ error: 'Resource parameter required' });
  }

  try {
    const { getConnection } = await import('../../lib/database.js');
    const connection = await getConnection();

    switch (req.method) {
      case 'GET':
        // List all records
        const [rows] = await connection.execute(`SELECT * FROM ${resource}`);
        await connection.end();
        return res.status(200).json(rows);

      case 'POST':
        // Create new record
        const createData = req.body;
        const createColumns = Object.keys(createData).join(', ');
        const createPlaceholders = Object.keys(createData).map(() => '?').join(', ');
        const createValues = Object.values(createData);
        
        const [createResult] = await connection.execute(
          `INSERT INTO ${resource} (${createColumns}) VALUES (${createPlaceholders})`,
          createValues
        );
        await connection.end();
        return res.status(201).json({ id: createResult.insertId, ...createData });

      case 'PUT':
        // Update record (expecting ID in URL like /api/resource?id=123)
        const { id } = req.query;
        if (!id) {
          await connection.end();
          return res.status(400).json({ error: 'ID parameter required for update' });
        }
        
        const updateData = req.body;
        const updateSetClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
        const updateValues = [...Object.values(updateData), id];
        
        await connection.execute(
          `UPDATE ${resource} SET ${updateSetClause} WHERE id = ?`,
          updateValues
        );
        await connection.end();
        return res.status(200).json({ id, ...updateData });

      case 'DELETE':
        // Delete record
        const { id: deleteId } = req.query;
        if (!deleteId) {
          await connection.end();
          return res.status(400).json({ error: 'ID parameter required for delete' });
        }
        
        await connection.execute(`DELETE FROM ${resource} WHERE id = ?`, [deleteId]);
        await connection.end();
        return res.status(200).json({ message: 'Deleted successfully' });

      default:
        await connection.end();
        return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    return res.status(500).json({ 
      error: error.message,
      resource,
      method: req.method
    });
  }
}
