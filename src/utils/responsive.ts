import type { SxProps, Theme } from '@mui/material';

// Mobile-friendly page-header sx prop. The CMS uses a recurring
// pattern of "title block on the left, action buttons on the right";
// on a phone that single horizontal row pushes the buttons off
// screen. This helper makes the row stack vertically below the sm
// breakpoint (≈600px) so the title and actions each get their own
// full-width line.
//
// Usage:
//
//   import { pageHeaderSx } from '../utils/responsive';
//   <Box sx={pageHeaderSx}>
//     <Typography variant="h4">Devices</Typography>
//     <Button startIcon={<AddIcon />}>New</Button>
//   </Box>
//
// Action containers can also use `actionsRowSx` below to keep
// multiple buttons together on the same wrap.
export const pageHeaderSx: SxProps<Theme> = {
  display: 'flex',
  flexDirection: { xs: 'column', sm: 'row' },
  justifyContent: 'space-between',
  alignItems: { xs: 'stretch', sm: 'center' },
  gap: 2,
  mb: 3,
};

// Row of action buttons that should wrap together. Use inside a
// page header so action chips/buttons keep their own flow when
// titles get long.
export const actionsRowSx: SxProps<Theme> = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 1,
  alignItems: 'center',
};

// Toolbar row that holds a search field + several Select filters.
// On mobile we want each control on its own line; on desktop they
// stay inline. Wrap with this in `<Paper>` for the filter strip
// above tables.
export const toolbarRowSx: SxProps<Theme> = {
  display: 'flex',
  flexDirection: { xs: 'column', sm: 'row' },
  flexWrap: 'wrap',
  gap: 1.5,
  alignItems: { xs: 'stretch', sm: 'center' },
};
