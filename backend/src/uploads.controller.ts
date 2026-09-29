import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';

export const UPLOADS_DIR = join(process.cwd(), 'uploads');

const ALLOWED_EXT = ['.png', '.jpg', '.jpeg', '.svg', '.webp', '.ico'];

interface UploadedImageFile {
  originalname: string;
  mimetype: string;
  size: number;
  filename: string;
  buffer: Buffer;
}

@Controller('uploads')
export class UploadsController {
  @Post('image')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          mkdirSync(UPLOADS_DIR, { recursive: true });
          cb(null, UPLOADS_DIR);
        },
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `img-${unique}${extname(file.originalname).toLowerCase()}`);
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_EXT.includes(extname(file.originalname).toLowerCase())) {
          cb(new BadRequestException('Only PNG, JPG, SVG, WEBP, or ICO files are allowed.'), false);
          return;
        }
        cb(null, true);
      },
    })
  )
  uploadImage(@UploadedFile() file?: UploadedImageFile) {
    if (!file) {
      throw new BadRequestException('No image file received.');
    }
    return { url: `/uploads/${file.filename}` };
  }
}
