import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { uploadExcelFile, getUploadedFiles } from "@/lib/api";
import { FileInfo } from "@/types";
import { UploadIcon, FileIcon, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";

interface FileUploadProps {
  onSelect: (fileInfo: FileInfo) => void;
}

export function FileUpload({ onSelect }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Fetch uploaded files when component mounts
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const uploadedFiles = await getUploadedFiles();
        setFiles(uploadedFiles);
      } catch (error) {
        toast({
          title: "שגיאה בטעינת קבצים",
          description: error instanceof Error ? error.message : "לא ניתן לטעון את רשימת הקבצים",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchFiles();
  }, [toast]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Validate file
    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      toast({
        title: "Unsupported File",
        description: "Please upload only Excel files (.xlsx or .xls)",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const fileInfo = await response.json();
      
      // Add new file to the list
      setFiles((prev) => [fileInfo.file, ...prev]);
      
      toast({
        title: "File Uploaded Successfully",
        description: `File "${selectedFile.name}" has been uploaded`,
      });
      
      // Select the newly uploaded file
      onSelect(fileInfo.file);
    } catch (error) {
      toast({
        title: "Upload Error",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSelectFile = (file: FileInfo) => {
    onSelect(file);
    toast({
      title: "נבחר קובץ",
      description: `הקובץ "${file.name}" נבחר לניתוח`,
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">קבצי Excel</h3>
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            className="hidden"
            accept=".xlsx,.xls"
          />
          <Button 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                מעלה...
              </>
            ) : (
              <>
                <UploadIcon className="mr-2 h-4 w-4" />
                העלאת קובץ
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : files.length === 0 ? (
          <div className="text-center p-4 text-muted-foreground">
            אין קבצים זמינים. העלה קובץ Excel כדי להתחיל.
          </div>
        ) : (
          files.map((file) => (
            <Card 
              key={file.filename} 
              className="p-3 cursor-pointer hover:bg-accent flex items-center justify-between"
              onClick={() => handleSelectFile(file)}
            >
              <div className="flex items-center">
                <FileIcon className="h-5 w-5 mr-2 text-blue-500" />
                <div>
                  <div className="font-medium line-clamp-1">{file.name}</div>
                  <div className="text-xs text-muted-foreground">{formatFileSize(file.size)}</div>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                בחר
              </Button>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}