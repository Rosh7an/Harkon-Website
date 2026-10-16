import { describe, it, expect } from 'vitest';
import { parseResponse } from '../components/AISpecChat';

describe('AISpecChat - parseResponse', () => {
  it('should parse ACTION:PROCEED correctly and strip it from display text', () => {
    const raw = "Looks great! We are ready. ACTION:PROCEED";
    const result = parseResponse(raw);
    
    expect(result.action).toBe('proceed');
    expect(result.displayText).toBe('Looks great! We are ready.');
    expect(result.options).toEqual([]);
    expect(result.multiOptions).toEqual([]);
    expect(result.syncFeatures).toBeNull();
    expect(result.milestone).toBeNull();
    expect(result.specSummary).toBeNull();
  });

  it('should handle ACTION:PROCEED mixed with other tags', () => {
    const raw = "Let's move on. OPTIONS:[\"Yes\", \"No\"] MILESTONE:4 ACTION:PROCEED";
    const result = parseResponse(raw);
    
    expect(result.action).toBe('proceed');
    expect(result.displayText).toBe("Let's move on.");
    expect(result.options).toEqual(["Yes", "No"]);
    expect(result.milestone).toBe(4);
  });

  it('should not set action if ACTION:PROCEED is missing', () => {
    const raw = "Here is the summary. OPTIONS:[\"Approve\", \"Change\"]";
    const result = parseResponse(raw);
    
    expect(result.action).toBeNull();
    expect(result.displayText).toBe('Here is the summary.');
    expect(result.options).toEqual(["Approve", "Change"]);
  });

  it('should correctly parse SPEC_SUMMARY', () => {
    const raw = "Here is your spec. SPEC_SUMMARY:This is the spec.\nLine 2";
    const result = parseResponse(raw);
    
    expect(result.specSummary).toBe('This is the spec.\nLine 2');
    expect(result.displayText).toBe('Here is your spec.');
  });

  it('should correctly extract SYNC_FEATURES', () => {
    const raw = "Added auth. SYNC_FEATURES:[\"webapp_auth\", \"webapp_stripe\"]";
    const result = parseResponse(raw);
    
    expect(result.syncFeatures).toEqual(['webapp_auth', 'webapp_stripe']);
    expect(result.displayText).toBe('Added auth.');
  });

  it('distinguishes an explicit empty feature sync from no sync instruction', () => {
    expect(parseResponse('Remove all. SYNC_FEATURES:[]').syncFeatures).toEqual([]);
    expect(parseResponse('No feature changes.').syncFeatures).toBeNull();
  });

  it('parses approval options placed after a specification summary', () => {
    const raw = 'Draft ready. SPEC_SUMMARY:**Scope**\n- Booking\nHow does this look? OPTIONS:["Approve", "Change"] MILESTONE:4';
    const result = parseResponse(raw);
    expect(result.displayText).toBe('Draft ready.');
    expect(result.specSummary).toBe('**Scope**\n- Booking\nHow does this look?');
    expect(result.options).toEqual(['Approve', 'Change']);
    expect(result.milestone).toBe(4);
  });

  it('parses a WhatsApp consultation action without exposing its control tag', () => {
    const result = parseResponse('A human can help. ACTION:WHATSAPP:[Hello team]');
    expect(result.action).toEqual({ type: 'whatsapp', message: 'Hello team' });
    expect(result.displayText).toBe('A human can help.');
  });

  it('should correctly extract MULTI_OPTIONS and remove OPTIONS if both exist (safeguard)', () => {
    const raw = "Choose: MULTI_OPTIONS:[\"A\", \"B\"] OPTIONS:[\"C\", \"D\"]";
    const result = parseResponse(raw);
    
    expect(result.multiOptions).toEqual(['A', 'B']);
    expect(result.options).toEqual([]); // Safeguard kicks in
    expect(result.displayText).toBe('Choose:');
  });
});
