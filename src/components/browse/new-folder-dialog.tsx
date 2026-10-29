'use client';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useState } from 'react';
import { useBrowseFolderPath } from '@/components/browse/browse-context';
import { folderEntriesQueryKey } from '@/lib/storage/entries-client';
import { createFolder } from '@/lib/storage/folders-client';
import { validateNewFolderName } from '@/lib/storage/folder-name';

interface NewFolderDialogProps {
  open: boolean;
  onClose: () => void;
}

export function NewFolderDialog({ open, onClose }: NewFolderDialogProps) {
  const folderPath = useBrowseFolderPath();
  const queryClient = useQueryClient();
  const fieldId = useId();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName('');
    setError(null);
    setSubmitting(false);
  }, [open]);

  const onSubmit = async () => {
    const validated = validateNewFolderName(name);
    if (!validated.ok) {
      setError(validated.message);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createFolder(folderPath, validated.name);
      await queryClient.invalidateQueries({ queryKey: folderEntriesQueryKey.path(folderPath) });
      await queryClient.invalidateQueries({
        queryKey: folderEntriesQueryKey.infinite(folderPath, 500),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>New folder</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          id={fieldId}
          label="Folder name"
          fullWidth
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (error) setError(null);
          }}
          error={Boolean(error)}
          helperText={
            error ??
            'URI-safe name: letters, digits, and - . _ ~ (no spaces or slashes).'
          }
          disabled={submitting}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void onSubmit();
            }
          }}
          slotProps={{
            htmlInput: { 'aria-describedby': `${fieldId}-hint` },
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="contained" onClick={() => void onSubmit()} disabled={submitting}>
          {submitting ? 'Creating…' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
