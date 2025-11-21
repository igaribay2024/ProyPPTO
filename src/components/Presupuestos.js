import React from 'react';
import ResourcePage from '../dashboard/ResourcePage';

export default function Presupuestos() {
  // Use the generic ResourcePage which renders the DataGrid and CRUD UI.
  return <ResourcePage resource="presupuestos" />;
}