import React from 'react';
import ResourcePage from '../dashboard/ResourcePage';

export default function Gastos() {
  // Render the unified ResourcePage (DataGrid + CRUD) for gastos
  return <ResourcePage resource="gastos" />;
}