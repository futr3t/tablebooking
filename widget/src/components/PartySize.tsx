import React from 'react';
import styles from './BookingForm.module.css';

interface PartySizeProps {
  maxPartySize: number;
  onPartySizeSelect: (size: number) => void;
  selectedSize: number;
  onBack: () => void;
  loading: boolean;
}

export const PartySize: React.FC<PartySizeProps> = ({
  maxPartySize,
  onPartySizeSelect,
  selectedSize,
  onBack,
  loading
}) => {
  const partySizes = Array.from({ length: maxPartySize }, (_, i) => i + 1);

  const handleSizeClick = (size: number) => {
    if (!loading) {
      onPartySizeSelect(size);
    }
  };

  return (
    <div className="party-size">
      <h3 className={styles.marginBottom}>Party Size</h3>
      <p style={{ marginBottom: '20px', color: '#666' }}>
        How many people will be dining?
      </p>

      <div className={styles.grid4} style={{ marginBottom: '24px' }}>
        {partySizes.map(size => (
          <button
            key={size}
            type="button"
            onClick={() => handleSizeClick(size)}
            disabled={loading}
            className={selectedSize === size ? styles.primaryButton : styles.secondaryButton}
            style={{
              aspectRatio: '1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              fontWeight: 600,
              position: 'relative'
            }}
          >
            {loading && selectedSize === size ? (
              <div className={styles.spinner} style={{ 
                width: '20px', 
                height: '20px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTop: '2px solid white'
              }} />
            ) : (
              size
            )}
          </button>
        ))}
      </div>

      {maxPartySize < 12 && (
        <div style={{
          textAlign: 'center',
          marginBottom: '24px',
          padding: '12px',
          background: '#f8f9fa',
          borderRadius: 'var(--tb-border-radius)',
          fontSize: '14px'
        }}>
          For parties larger than {maxPartySize}, please call the restaurant directly.
        </div>
      )}

      <div className={styles.flex}>
        <button
          type="button"
          onClick={onBack}
          className={styles.backButton}
          disabled={loading}
        >
          ← Back
        </button>
        
        {selectedSize > 0 && (
          <button
            type="button"
            onClick={() => handleSizeClick(selectedSize)}
            className={styles.primaryButton}
            disabled={loading}
            style={{ flex: 1 }}
          >
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className={styles.spinner} style={{ 
                  width: '16px', 
                  height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid white',
                  marginRight: '8px'
                }} />
                Finding Tables...
              </div>
            ) : (
              `Continue with ${selectedSize} ${selectedSize === 1 ? 'Person' : 'People'}`
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default PartySize;