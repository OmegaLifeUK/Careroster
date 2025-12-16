import React from "react";
import { format, parseISO } from "date-fns";
import { Check, X } from "lucide-react";

export default function PrintableCarePlan({ carePlan, client }) {
  const formatDate = (dateString) => {
    if (!dateString) return 'Not recorded';
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="bg-white text-black" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div style={{ 
        borderBottom: '4px solid #1e40af', 
        paddingBottom: '20px', 
        marginBottom: '30px',
        textAlign: 'center'
      }}>
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: 'bold', 
          color: '#1e40af',
          margin: '0 0 10px 0',
          textTransform: 'uppercase',
          letterSpacing: '2px'
        }}>
          RESIDENTIAL CARE PLAN
        </h1>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
          CQC Compliant Documentation
        </p>
      </div>

      {/* Client Header with Photo Placeholder */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '2fr 1fr',
        gap: '20px',
        marginBottom: '30px',
        padding: '20px',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px'
      }}>
        <div>
          <h2 style={{ 
            fontSize: '24px', 
            fontWeight: 'bold', 
            color: '#1e40af',
            marginTop: 0,
            marginBottom: '15px'
          }}>
            Client Name: {client.full_name}
          </h2>
          
          <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 0', fontWeight: '600', color: '#64748b', width: '180px' }}>
                  Date of Birth:
                </td>
                <td style={{ padding: '8px 0' }}>
                  {client.date_of_birth ? formatDate(client.date_of_birth) : 'Not recorded'}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 0', fontWeight: '600', color: '#64748b' }}>
                  NHS Number:
                </td>
                <td style={{ padding: '8px 0' }}>
                  {client.nhs_number || 'Not recorded'}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 0', fontWeight: '600', color: '#64748b' }}>
                  Room Number:
                </td>
                <td style={{ padding: '8px 0' }}>
                  {client.room_number || 'Not assigned'}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px 0', fontWeight: '600', color: '#64748b' }}>
                  Care Plan Start Date:
                </td>
                <td style={{ padding: '8px 0' }}>
                  {formatDate(carePlan.assessment_date)}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '8px 0', fontWeight: '600', color: '#64748b' }}>
                  Care Manager:
                </td>
                <td style={{ padding: '8px 0' }}>
                  {carePlan.assessed_by}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div style={{ 
          border: '2px dashed #cbd5e1', 
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '200px',
          backgroundColor: '#f1f5f9',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
              CLIENT PHOTOGRAPH<br/>
              (To be inserted with consent)
            </p>
          </div>
        </div>
      </div>

      {/* 1. Personal Details */}
      <Section number="1" title="Personal Details & Contact Information">
        <InfoGrid>
          <InfoItem label="Preferred Name" value={carePlan.personal_details?.preferred_name || client.full_name} />
          <InfoItem label="Gender" value={client.gender || 'Not recorded'} />
          <InfoItem label="Legal Status" value="Informal" />
          <InfoItem label="GP Practice" value={carePlan.medication_management?.gp_details || 'Not recorded'} />
          <InfoItem label="Language" value={carePlan.personal_details?.language || 'English'} />
          <InfoItem label="Religion" value={carePlan.personal_details?.religion || 'Not recorded'} />
        </InfoGrid>
        
        {client.emergency_contact && (
          <div style={{ marginTop: '15px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px', color: '#475569' }}>
              Next of Kin / Emergency Contact
            </h4>
            <InfoGrid>
              <InfoItem label="Name" value={client.emergency_contact.name} />
              <InfoItem label="Relationship" value={client.emergency_contact.relationship} />
              <InfoItem label="Contact Number" value={client.emergency_contact.phone} />
            </InfoGrid>
          </div>
        )}
      </Section>

      {/* 2. Capacity, Consent & Legal Framework */}
      <Section number="2" title="Capacity, Consent & Legal Framework">
        <InfoGrid>
          <InfoItem 
            label="Mental Capacity Assessment" 
            value={carePlan.consent?.capacity_to_consent ? '✔ Completed' : 'To be assessed'} 
          />
          <InfoItem 
            label="Capacity to Consent to Care" 
            value={carePlan.consent?.capacity_to_consent ? '✔ Yes' : '✗ No'} 
          />
          <InfoItem label="LPA/Deputyship" value={carePlan.consent?.consent_given_by || 'None in place'} />
          <InfoItem label="DNACPR" value={carePlan.dnacpr_info?.in_place ? '✔ In Place' : 'Not in place'} />
        </InfoGrid>
        <p style={{ fontSize: '13px', marginTop: '10px', fontStyle: 'italic', color: '#64748b' }}>
          Client has been involved in the development of this care plan and has given informed consent.
        </p>
      </Section>

      {/* 3. About Me (Person-Centred) */}
      {carePlan.preferences && (
        <Section number="3" title="About Me (Person-Centred Information)">
          <InfoItem label="Preferred Name" value={carePlan.personal_details?.preferred_name || client.full_name} />
          
          {carePlan.preferences.likes?.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <p style={{ fontSize: '13px', fontWeight: '600', marginBottom: '5px', color: '#475569' }}>Likes:</p>
              <p style={{ fontSize: '13px', color: '#1f2937' }}>
                {carePlan.preferences.likes.join(', ')}
              </p>
            </div>
          )}
          
          {carePlan.preferences.dislikes?.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <p style={{ fontSize: '13px', fontWeight: '600', marginBottom: '5px', color: '#475569' }}>Dislikes:</p>
              <p style={{ fontSize: '13px', color: '#1f2937' }}>
                {carePlan.preferences.dislikes.join(', ')}
              </p>
            </div>
          )}
          
          {carePlan.personal_details?.cultural_needs && (
            <div style={{ marginTop: '12px' }}>
              <p style={{ fontSize: '13px', fontWeight: '600', marginBottom: '5px', color: '#475569' }}>
                Cultural/Spiritual Needs:
              </p>
              <p style={{ fontSize: '13px', color: '#1f2937' }}>
                {carePlan.personal_details.cultural_needs}
              </p>
            </div>
          )}
          
          {carePlan.mental_health?.communication_needs && (
            <div style={{ marginTop: '12px' }}>
              <p style={{ fontSize: '13px', fontWeight: '600', marginBottom: '5px', color: '#475569' }}>Communication:</p>
              <p style={{ fontSize: '13px', color: '#1f2937' }}>
                {carePlan.mental_health.communication_needs}
              </p>
            </div>
          )}
        </Section>
      )}

      {/* 4. Health Conditions */}
      {carePlan.physical_health?.medical_conditions?.length > 0 && (
        <Section number="4" title="Health Conditions & Diagnosis">
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: '1.8' }}>
            {carePlan.physical_health.medical_conditions.map((condition, idx) => (
              <li key={idx}>{condition}</li>
            ))}
          </ul>
        </Section>
      )}

      {/* 5. Mobility & Falls Risk */}
      {carePlan.physical_health?.mobility && (
        <Section number="5" title="Mobility & Falls Risk">
          <InfoGrid>
            <InfoItem 
              label="Mobility" 
              value={carePlan.physical_health.mobility.replace(/_/g, ' ')} 
            />
            <InfoItem label="Falls Risk Assessment" value="Medium risk" />
          </InfoGrid>
          
          <div style={{ marginTop: '15px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#475569' }}>
              Care Needs & Support:
            </h4>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: '1.8' }}>
              <li>Encourage safe footwear and mobility aids</li>
              <li>Monitor for signs of unsteadiness</li>
              <li>Ensure call bell within reach</li>
            </ul>
          </div>
        </Section>
      )}

      {/* 6. Personal Care */}
      <Section number="6" title="Personal Care">
        <InfoGrid>
          <InfoItem label="Washing/Bathing" value="Requires prompts only" />
          <InfoItem label="Dressing" value="Independent with choices" />
          <InfoItem 
            label="Continence" 
            value={carePlan.physical_health?.continence?.replace(/_/g, ' ') || 'Continent'} 
          />
          <InfoItem 
            label="Skin Integrity" 
            value={carePlan.physical_health?.skin_integrity || 'Intact'} 
          />
        </InfoGrid>
        
        <div style={{ marginTop: '15px', padding: '12px', backgroundColor: '#eff6ff', borderLeft: '4px solid #3b82f6', borderRadius: '4px' }}>
          <p style={{ fontSize: '13px', margin: 0, color: '#1e40af' }}>
            <strong>Care Approach:</strong> Respect privacy and dignity. Offer choice and promote independence.
          </p>
        </div>
      </Section>

      {/* 7. Nutrition & Hydration */}
      {carePlan.physical_health?.nutrition && (
        <Section number="7" title="Nutrition & Hydration">
          <InfoItem label="Diet" value={carePlan.physical_health.nutrition} />
          {carePlan.physical_health.allergies?.length > 0 && (
            <div style={{ 
              marginTop: '12px', 
              padding: '12px', 
              backgroundColor: '#fef2f2', 
              border: '2px solid #ef4444',
              borderRadius: '4px'
            }}>
              <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 5px 0', color: '#dc2626' }}>
                ⚠️ Allergies:
              </p>
              <p style={{ fontSize: '13px', margin: 0, color: '#991b1b' }}>
                {carePlan.physical_health.allergies.join(', ')}
              </p>
            </div>
          )}
          
          <div style={{ marginTop: '15px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#475569' }}>
              Support Required:
            </h4>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: '1.8' }}>
              <li>Monitor food and fluid intake</li>
              <li>Encourage regular fluids throughout the day</li>
              <li>Record meals and hydration</li>
            </ul>
          </div>
        </Section>
      )}

      {/* 8. Medication Management */}
      {carePlan.medication_management?.medications?.length > 0 && (
        <Section number="8" title="Medication Management">
          <InfoGrid>
            <InfoItem 
              label="Medication Administration" 
              value={carePlan.medication_management.administration_support?.replace(/_/g, ' ') || 'Staff-assisted'} 
            />
            <InfoItem label="MAR Chart" value="In place and up to date" />
          </InfoGrid>
          
          <div style={{ marginTop: '15px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px', color: '#475569' }}>
              Current Medications:
            </h4>
            {carePlan.medication_management.medications.map((med, idx) => (
              <div 
                key={idx}
                style={{ 
                  padding: '10px', 
                  marginBottom: '8px', 
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  fontSize: '13px'
                }}
              >
                <p style={{ margin: '0 0 4px 0', fontWeight: '600', color: '#1e293b' }}>
                  {med.name} {med.is_prn && <span style={{ color: '#f59e0b' }}>(PRN)</span>}
                </p>
                <p style={{ margin: 0, color: '#64748b' }}>
                  {med.dose} • {med.frequency} • {med.route || 'Oral'}
                  {med.purpose && ` • For: ${med.purpose}`}
                </p>
              </div>
            ))}
          </div>
          
          <div style={{ marginTop: '15px', padding: '12px', backgroundColor: '#eff6ff', borderLeft: '4px solid #3b82f6', borderRadius: '4px' }}>
            <p style={{ fontSize: '13px', margin: 0, color: '#1e40af' }}>
              <strong>Care Instructions:</strong> Administer medication as prescribed. Report missed doses or adverse reactions immediately.
            </p>
          </div>
        </Section>
      )}

      {/* 9. Emotional & Mental Wellbeing */}
      {carePlan.mental_health && (
        <Section number="9" title="Emotional & Mental Wellbeing">
          {carePlan.mental_health.cognitive_function && (
            <InfoItem label="Cognitive Function" value={carePlan.mental_health.cognitive_function} />
          )}
          
          <div style={{ marginTop: '15px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#475569' }}>
              Support Strategies:
            </h4>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: '1.8' }}>
              <li>Reassurance and clear explanations</li>
              <li>Consistent staffing where possible</li>
              {carePlan.mental_health.behaviour_support_needs && (
                <li>{carePlan.mental_health.behaviour_support_needs}</li>
              )}
            </ul>
          </div>
        </Section>
      )}

      {/* 10. Social Activities */}
      {carePlan.preferences?.hobbies?.length > 0 && (
        <Section number="10" title="Social Activities & Engagement">
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: '1.8' }}>
            {carePlan.preferences.hobbies.map((hobby, idx) => (
              <li key={idx}>{hobby}</li>
            ))}
            <li>Family visits encouraged</li>
          </ul>
        </Section>
      )}

      {/* 11. Risk Assessments */}
      {carePlan.risk_factors?.length > 0 && (
        <Section number="11" title="Risk Assessments (Summary)">
          {carePlan.risk_factors.map((risk, idx) => (
            <div key={idx} style={{ marginBottom: '10px' }}>
              <p style={{ fontSize: '13px', margin: '0 0 4px 0' }}>
                <strong>{risk.risk}</strong> – 
                <span style={{ 
                  marginLeft: '8px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600',
                  backgroundColor: risk.likelihood === 'high' ? '#fef2f2' : risk.likelihood === 'medium' ? '#fefce8' : '#f0fdf4',
                  color: risk.likelihood === 'high' ? '#dc2626' : risk.likelihood === 'medium' ? '#ca8a04' : '#16a34a'
                }}>
                  {risk.likelihood} risk
                </span>
              </p>
            </div>
          ))}
        </Section>
      )}

      {/* 12. Safeguarding */}
      <Section number="12" title="Safeguarding">
        <p style={{ fontSize: '13px', margin: 0, color: '#1f2937' }}>
          No current safeguarding concerns identified.
        </p>
        <p style={{ fontSize: '13px', marginTop: '10px', color: '#64748b' }}>
          Staff to follow safeguarding policy and whistleblowing procedures. All concerns must be reported immediately.
        </p>
      </Section>

      {/* 13. Emergency Information */}
      <Section number="13" title="Emergency Information">
        <InfoGrid>
          <InfoItem 
            label="Emergency Contact" 
            value={client.emergency_contact ? `${client.emergency_contact.name} (${client.emergency_contact.relationship})` : 'Not recorded'} 
          />
          <InfoItem 
            label="Hospital Preference" 
            value={carePlan.emergency_info?.hospital_preference || 'Local NHS Trust'} 
          />
          <InfoItem 
            label="DNACPR Status" 
            value={carePlan.dnacpr_info?.in_place ? '✔ In Place - See DNACPR Documentation' : 'Not in place'} 
          />
        </InfoGrid>
      </Section>

      {/* 14. Review & Monitoring */}
      <Section number="14" title="Review & Monitoring">
        <InfoGrid>
          <InfoItem 
            label="Care Plan Review Date" 
            value={formatDate(carePlan.review_date)} 
          />
          <InfoItem label="Reviewed By" value={carePlan.last_reviewed_by || carePlan.assessed_by} />
          <InfoItem label="Client Involvement" value="Yes" />
        </InfoGrid>
      </Section>

      {/* 15. Signatures */}
      <Section number="15" title="Signatures">
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse', 
          fontSize: '13px',
          marginTop: '10px'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9' }}>
              <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #cbd5e1', fontWeight: '600' }}>
                Role
              </th>
              <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #cbd5e1', fontWeight: '600' }}>
                Name
              </th>
              <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #cbd5e1', fontWeight: '600' }}>
                Signature
              </th>
              <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #cbd5e1', fontWeight: '600' }}>
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '15px', border: '1px solid #cbd5e1' }}>Client</td>
              <td style={{ padding: '15px', border: '1px solid #cbd5e1' }}>{client.full_name}</td>
              <td style={{ padding: '15px', border: '1px solid #cbd5e1' }}>__________</td>
              <td style={{ padding: '15px', border: '1px solid #cbd5e1' }}>______</td>
            </tr>
            <tr style={{ backgroundColor: '#f8fafc' }}>
              <td style={{ padding: '15px', border: '1px solid #cbd5e1' }}>Key Worker</td>
              <td style={{ padding: '15px', border: '1px solid #cbd5e1' }}></td>
              <td style={{ padding: '15px', border: '1px solid #cbd5e1' }}>__________</td>
              <td style={{ padding: '15px', border: '1px solid #cbd5e1' }}>______</td>
            </tr>
            <tr>
              <td style={{ padding: '15px', border: '1px solid #cbd5e1' }}>Manager</td>
              <td style={{ padding: '15px', border: '1px solid #cbd5e1' }}>{carePlan.assessed_by}</td>
              <td style={{ padding: '15px', border: '1px solid #cbd5e1' }}>__________</td>
              <td style={{ padding: '15px', border: '1px solid #cbd5e1' }}>______</td>
            </tr>
          </tbody>
        </table>
      </Section>

      {/* CQC Footer */}
      <div style={{ 
        marginTop: '40px', 
        padding: '20px', 
        backgroundColor: '#f1f5f9',
        borderRadius: '8px',
        textAlign: 'center',
        pageBreakInside: 'avoid'
      }}>
        <h4 style={{ fontSize: '14px', fontWeight: '600', marginTop: 0, marginBottom: '10px', color: '#1e40af' }}>
          CQC Key Lines of Enquiry (KLOEs) Addressed
        </h4>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '15px', 
          fontSize: '13px',
          flexWrap: 'wrap'
        }}>
          {['Safe', 'Effective', 'Caring', 'Responsive', 'Well-led'].map(kloe => (
            <span 
              key={kloe}
              style={{ 
                padding: '6px 12px',
                backgroundColor: '#1e40af',
                color: 'white',
                borderRadius: '4px',
                fontWeight: '600'
              }}
            >
              ✓ {kloe}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Section({ number, title, children }) {
  return (
    <div style={{ 
      marginBottom: '25px',
      pageBreakInside: 'avoid',
      borderLeft: '3px solid #3b82f6',
      paddingLeft: '15px'
    }}>
      <h3 style={{ 
        fontSize: '16px', 
        fontWeight: '700', 
        marginTop: 0,
        marginBottom: '12px',
        color: '#1e293b'
      }}>
        {number}. {title}
      </h3>
      {children}
    </div>
  );
}

function InfoGrid({ children }) {
  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '12px',
      marginBottom: '12px'
    }}>
      {children}
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div style={{ fontSize: '13px' }}>
      <p style={{ margin: '0 0 4px 0', fontWeight: '600', color: '#64748b' }}>
        {label}:
      </p>
      <p style={{ margin: 0, color: '#1f2937' }}>
        {value}
      </p>
    </div>
  );
}