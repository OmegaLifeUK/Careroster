import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, Plus, Edit2, Trash2, User, PhoneCall } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function EmergencyContactsManager({ client, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [contacts, setContacts] = useState(client.emergency_contacts || [
    client.emergency_contact || { name: "", phone: "", relationship: "" }
  ]);

  const addContact = () => {
    setContacts([...contacts, { name: "", phone: "", relationship: "" }]);
    setIsEditing(true);
  };

  const updateContact = (index, field, value) => {
    const newContacts = [...contacts];
    newContacts[index] = { ...newContacts[index], [field]: value };
    setContacts(newContacts);
  };

  const removeContact = (index) => {
    const newContacts = contacts.filter((_, i) => i !== index);
    setContacts(newContacts);
  };

  const handleSave = () => {
    const validContacts = contacts.filter(c => c.name || c.phone);
    onUpdate({ emergency_contacts: validContacts });
    setIsEditing(false);
  };

  const handleCall = (phoneNumber) => {
    window.location.href = `tel:${phoneNumber}`;
  };

  return (
    <Card>
      <CardHeader className="border-b bg-gradient-to-r from-red-50 to-orange-50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PhoneCall className="w-5 h-5 text-red-600" />
              Emergency Contacts
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">Manage client emergency contact information</p>
          </div>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)} size="sm" variant="outline">
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {isEditing ? (
          <div className="space-y-4">
            {contacts.map((contact, index) => (
              <div key={index} className="p-4 border rounded-lg bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Contact #{index + 1}</h4>
                  {contacts.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeContact(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor={`name-${index}`}>Full Name</Label>
                    <Input
                      id={`name-${index}`}
                      value={contact.name}
                      onChange={(e) => updateContact(index, 'name', e.target.value)}
                      placeholder="Enter name"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`phone-${index}`}>Phone Number</Label>
                    <Input
                      id={`phone-${index}`}
                      type="tel"
                      value={contact.phone}
                      onChange={(e) => updateContact(index, 'phone', e.target.value)}
                      placeholder="Enter phone"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`relationship-${index}`}>Relationship</Label>
                    <Input
                      id={`relationship-${index}`}
                      value={contact.relationship}
                      onChange={(e) => updateContact(index, 'relationship', e.target.value)}
                      placeholder="e.g., Daughter, Son"
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button
              variant="outline"
              onClick={addContact}
              className="w-full border-dashed"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Another Contact
            </Button>

            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={handleSave} className="bg-red-600 hover:bg-red-700">
                Save Contacts
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setContacts(client.emergency_contacts || [client.emergency_contact || { name: "", phone: "", relationship: "" }]);
                  setIsEditing(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.filter(c => c.name || c.phone).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Phone className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No emergency contacts added</p>
                <Button
                  onClick={() => setIsEditing(true)}
                  size="sm"
                  className="mt-3"
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Emergency Contact
                </Button>
              </div>
            ) : (
              contacts.filter(c => c.name || c.phone).map((contact, index) => (
                <Card key={index} className="border-2 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-orange-400 flex items-center justify-center text-white font-semibold flex-shrink-0">
                          <User className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg">{contact.name}</h4>
                          {contact.relationship && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              {contact.relationship}
                            </Badge>
                          )}
                          {contact.phone && (
                            <div className="flex items-center gap-2 mt-2">
                              <Phone className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-700">{contact.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {contact.phone && (
                        <Button
                          onClick={() => handleCall(contact.phone)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 ml-2"
                        >
                          <PhoneCall className="w-4 h-4 mr-2" />
                          Call Now
                        </Button>
                      )}
                    </div>

                    <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                      <strong>Priority Contact {index + 1}</strong> - This contact will be reached in case of emergencies
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}