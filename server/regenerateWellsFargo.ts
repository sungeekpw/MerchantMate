import { pool } from './db';
import { getWellsFargoMPAForm } from './wellsFargoMPA';

async function regenerateFormFields() {
  try {
    const formSections = getWellsFargoMPAForm();
    const formId = 1;
    
    console.log('Regenerating Wells Fargo form with', formSections.reduce((acc, section) => acc + section.fields.length, 0), 'fields');
    
    for (const section of formSections) {
      for (const field of section.fields) {
        const query = `
          INSERT INTO pdf_form_fields (
            form_id, field_name, field_type, field_label, is_required, 
            options, default_value, validation, position, section, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        `;
        
        await pool.query(query, [
          formId,
          field.fieldName,
          field.fieldType,
          field.fieldLabel,
          field.isRequired,
          field.options || null,
          field.defaultValue || null,
          field.validation || null,
          field.position,
          field.section
        ]);
      }
    }
    
    console.log('Form fields regenerated successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error regenerating form fields:', error);
    process.exit(1);
  }
}

regenerateFormFields();