import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileUpload, UploadedFile } from '../FileUpload'

describe('FileUpload Component', () => {
  const mockOnFilesChange = jest.fn()
  const mockOnUpload = jest.fn()
  const mockOnDelete = jest.fn()

  const defaultProps = {
    files: [],
    onFilesChange: mockOnFilesChange,
    onUpload: mockOnUpload,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders upload dropzone', () => {
    render(<FileUpload {...defaultProps} />)
    
    expect(screen.getByText('파일을 드래그하거나 클릭하여 업로드')).toBeInTheDocument()
  })

  it('shows custom dropzone text', () => {
    render(
      <FileUpload 
        {...defaultProps} 
        dropzoneText="Custom upload text"
        dragActiveText="Custom drag text"
      />
    )
    
    expect(screen.getByText('Custom upload text')).toBeInTheDocument()
  })

  it('displays allowed file types and size limit', () => {
    render(<FileUpload {...defaultProps} />)
    
    expect(screen.getByText(/JPG, PNG, GIF/)).toBeInTheDocument()
    expect(screen.getByText(/최대 10MB/)).toBeInTheDocument()
  })

  it('handles file selection via input', async () => {
    const file = new File(['test'], 'test.png', { type: 'image/png' })
    mockOnUpload.mockResolvedValue({
      id: '1',
      name: 'test.png',
      size: 4,
      type: 'image/png',
      status: 'completed',
      url: 'https://example.com/test.png',
    } as UploadedFile)

    render(<FileUpload {...defaultProps} />)
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    
    await userEvent.upload(input, file)
    
    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalledWith(file)
      expect(mockOnFilesChange).toHaveBeenCalled()
    })
  })

  it('validates file size', async () => {
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.png', { type: 'image/png' })
    
    render(<FileUpload {...defaultProps} maxSize={10 * 1024 * 1024} />)
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    
    await userEvent.upload(input, largeFile)
    
    // Should not call onUpload for oversized file
    expect(mockOnUpload).not.toHaveBeenCalled()
  })

  it('validates file type', async () => {
    const invalidFile = new File(['test'], 'test.exe', { type: 'application/exe' })
    
    render(<FileUpload {...defaultProps} />)
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    
    await userEvent.upload(input, invalidFile)
    
    // Should not call onUpload for invalid file type
    expect(mockOnUpload).not.toHaveBeenCalled()
  })

  it('displays uploaded files', () => {
    const files: UploadedFile[] = [
      {
        id: '1',
        name: 'test1.png',
        size: 1024,
        type: 'image/png',
        status: 'completed',
        url: 'https://example.com/test1.png',
      },
      {
        id: '2',
        name: 'test2.pdf',
        size: 2048,
        type: 'application/pdf',
        status: 'completed',
        url: 'https://example.com/test2.pdf',
      },
    ]
    
    render(<FileUpload {...defaultProps} files={files} />)
    
    expect(screen.getByText('test1.png')).toBeInTheDocument()
    expect(screen.getByText('test2.pdf')).toBeInTheDocument()
    expect(screen.getByText('1 KB')).toBeInTheDocument()
    expect(screen.getByText('2 KB')).toBeInTheDocument()
  })

  it('shows upload progress', () => {
    const files: UploadedFile[] = [
      {
        id: '1',
        name: 'uploading.png',
        size: 1024,
        type: 'image/png',
        status: 'uploading',
        uploadProgress: 50,
      },
    ]
    
    render(<FileUpload {...defaultProps} files={files} />)
    
    expect(screen.getByText('50% 업로드 중...')).toBeInTheDocument()
  })

  it('handles file deletion', async () => {
    mockOnDelete.mockResolvedValue(undefined)
    
    const files: UploadedFile[] = [
      {
        id: '1',
        name: 'test.png',
        size: 1024,
        type: 'image/png',
        status: 'completed',
        url: 'https://example.com/test.png',
      },
    ]
    
    render(<FileUpload {...defaultProps} files={files} onDelete={mockOnDelete} />)
    
    const deleteButton = screen.getByRole('button', { name: '' })
    fireEvent.click(deleteButton)
    
    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalledWith('1')
      expect(mockOnFilesChange).toHaveBeenCalled()
    })
  })

  it('shows error state for failed uploads', () => {
    const files: UploadedFile[] = [
      {
        id: '1',
        name: 'failed.png',
        size: 1024,
        type: 'image/png',
        status: 'error',
        error: '업로드 실패',
      },
    ]
    
    render(<FileUpload {...defaultProps} files={files} />)
    
    expect(screen.getByText('업로드 실패')).toBeInTheDocument()
    expect(screen.getByText('실패')).toBeInTheDocument()
  })

  it('respects maxFiles limit', () => {
    const files: UploadedFile[] = [
      {
        id: '1',
        name: 'test1.png',
        size: 1024,
        type: 'image/png',
        status: 'completed',
      },
      {
        id: '2',
        name: 'test2.png',
        size: 1024,
        type: 'image/png',
        status: 'completed',
      },
    ]
    
    render(<FileUpload {...defaultProps} files={files} maxFiles={2} />)
    
    expect(screen.getByText('2/2개 파일')).toBeInTheDocument()
  })

  it('handles drag and drop', async () => {
    mockOnUpload.mockResolvedValue({
      id: '1',
      name: 'dropped.png',
      size: 1024,
      type: 'image/png',
      status: 'completed',
    } as UploadedFile)

    render(<FileUpload {...defaultProps} />)
    
    const dropzone = screen.getByText('파일을 드래그하거나 클릭하여 업로드').parentElement?.parentElement
    
    if (dropzone) {
      const file = new File(['test'], 'dropped.png', { type: 'image/png' })
      const dataTransfer = {
        files: [file],
        items: [{ kind: 'file', getAsFile: () => file }],
      }
      
      fireEvent.dragEnter(dropzone)
      fireEvent.dragOver(dropzone)
      fireEvent.drop(dropzone, { dataTransfer })
      
      await waitFor(() => {
        expect(mockOnUpload).toHaveBeenCalledWith(file)
      })
    }
  })

  it('disables upload when disabled prop is true', () => {
    render(<FileUpload {...defaultProps} disabled />)
    
    const dropzone = screen.getByText('파일을 드래그하거나 클릭하여 업로드').parentElement?.parentElement
    expect(dropzone).toHaveClass('opacity-50', 'cursor-not-allowed')
  })
})