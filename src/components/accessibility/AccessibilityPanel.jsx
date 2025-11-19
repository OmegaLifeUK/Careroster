import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Type, Volume2, Mic, Sparkles, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function AccessibilityPanel({ onClose }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const { data: settings } = useQuery({
    queryKey: ['accessibility-settings', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return null;
      const data = await base44.entities.AccessibilitySettings.filter({ user_email: currentUser.email });
      return Array.isArray(data) && data.length > 0 ? data[0] : null;
    },
    enabled: !!currentUser?.email,
  });

  const [formData, setFormData] = useState({
    theme_mode: settings?.theme_mode || 'light',
    background_color: settings?.background_color || '#ffffff',
    text_color: settings?.text_color || '#000000',
    text_size: settings?.text_size || 'medium',
    text_to_speech_enabled: settings?.text_to_speech_enabled || false,
    speech_rate: settings?.speech_rate || 1.0,
    dictation_enabled: settings?.dictation_enabled || false,
    grammar_check_enabled: settings?.grammar_check_enabled || false,
    high_contrast: settings?.high_contrast || false,
  });

  React.useEffect(() => {
    if (settings) {
      setFormData({
        theme_mode: settings.theme_mode || 'light',
        background_color: settings.background_color || '#ffffff',
        text_color: settings.text_color || '#000000',
        text_size: settings.text_size || 'medium',
        text_to_speech_enabled: settings.text_to_speech_enabled || false,
        speech_rate: settings.speech_rate || 1.0,
        dictation_enabled: settings.dictation_enabled || false,
        grammar_check_enabled: settings.grammar_check_enabled || false,
        high_contrast: settings.high_contrast || false,
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (settings) {
        return base44.entities.AccessibilitySettings.update(settings.id, data);
      }
      return base44.entities.AccessibilitySettings.create({
        ...data,
        user_email: currentUser.email
      });
    },
    onSuccess: (savedSettings) => {
      queryClient.invalidateQueries({ queryKey: ['accessibility-settings'] });
      applySettings(savedSettings);
      toast.success("Success", "Accessibility settings saved");
    },
  });

  const applySettings = (settings) => {
    const root = document.documentElement;
    
    // Theme mode
    if (settings.theme_mode === 'dark') {
      root.style.setProperty('--bg-color', '#1a1a1a');
      root.style.setProperty('--text-color', '#ffffff');
    } else if (settings.theme_mode === 'dyslexia') {
      root.style.setProperty('--bg-color', '#faf4e8');
      root.style.setProperty('--text-color', '#2c2c2c');
      root.style.fontFamily = 'OpenDyslexic, Arial, sans-serif';
    } else {
      root.style.setProperty('--bg-color', settings.background_color);
      root.style.setProperty('--text-color', settings.text_color);
    }

    // Text size
    const sizes = { small: '14px', medium: '16px', large: '18px', xlarge: '20px' };
    root.style.fontSize = sizes[settings.text_size] || '16px';

    // High contrast
    if (settings.high_contrast) {
      root.style.setProperty('--bg-color', '#000000');
      root.style.setProperty('--text-color', '#ffff00');
    }

    // Store in localStorage for persistence
    localStorage.setItem('accessibility_settings', JSON.stringify(settings));
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const presetThemes = [
    { name: 'Light', mode: 'light', bg: '#ffffff', text: '#000000' },
    { name: 'Dark', mode: 'dark', bg: '#1a1a1a', text: '#ffffff' },
    { name: 'Dyslexia Friendly', mode: 'dyslexia', bg: '#faf4e8', text: '#2c2c2c' },
    { name: 'High Contrast', mode: 'light', bg: '#000000', text: '#ffff00', contrast: true },
    { name: 'Sepia', mode: 'light', bg: '#f4ecd8', text: '#5b4636' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Accessibility Settings
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Preset Themes */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Quick Themes</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {presetThemes.map(theme => (
                  <button
                    key={theme.name}
                    onClick={() => setFormData({
                      ...formData,
                      theme_mode: theme.mode,
                      background_color: theme.bg,
                      text_color: theme.text,
                      high_contrast: theme.contrast || false
                    })}
                    className="p-4 border-2 rounded-lg hover:border-blue-500 transition-colors"
                    style={{ backgroundColor: theme.bg, color: theme.text }}
                  >
                    <p className="font-medium">{theme.name}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Colors */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block">Background Color</Label>
                <input
                  type="color"
                  value={formData.background_color}
                  onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                  className="w-full h-12 rounded cursor-pointer"
                />
              </div>
              <div>
                <Label className="mb-2 block">Text Color</Label>
                <input
                  type="color"
                  value={formData.text_color}
                  onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                  className="w-full h-12 rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Text Size */}
            <div>
              <Label className="mb-2 block flex items-center gap-2">
                <Type className="w-4 h-4" />
                Text Size
              </Label>
              <Select value={formData.text_size} onValueChange={(val) => setFormData({ ...formData, text_size: val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                  <SelectItem value="xlarge">Extra Large</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Text-to-Speech */}
            <div>
              <Label className="mb-3 block flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                Text-to-Speech
              </Label>
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.text_to_speech_enabled}
                    onChange={(e) => setFormData({ ...formData, text_to_speech_enabled: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Enable audio reading of text</span>
                </label>
                {formData.text_to_speech_enabled && (
                  <div>
                    <Label className="text-sm">Speech Rate: {formData.speech_rate}x</Label>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={formData.speech_rate}
                      onChange={(e) => setFormData({ ...formData, speech_rate: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Dictation */}
            <div>
              <Label className="mb-3 block flex items-center gap-2">
                <Mic className="w-4 h-4" />
                Voice Dictation
              </Label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.dictation_enabled}
                  onChange={(e) => setFormData({ ...formData, dictation_enabled: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Enable speech-to-text in text fields</span>
              </label>
            </div>

            {/* AI Grammar */}
            <div>
              <Label className="mb-3 block flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                AI Writing Assistant
              </Label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.grammar_check_enabled}
                  onChange={(e) => setFormData({ ...formData, grammar_check_enabled: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm">Enable AI grammar and spelling assistance</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}