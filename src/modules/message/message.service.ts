import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';

import { PrismaService } from 'src/prisma/prisma.service';
import { MessageGateway } from './message.gateway';

@Injectable()
export class MessageService {

  constructor(
    private prisma: PrismaService,
    private gateway: MessageGateway,
  ) {}

  // ✅ CREATE MESSAGE
  async create(dto: CreateMessageDto, file?: any) {

    if (!dto.content && !file) {
      throw new BadRequestException(
        'Message content or file is required',
      );
    }

    const message = await this.prisma.message.create({
      data: {

        content: dto.content ?? null,

        fileUrl: file?.filename
          ? `/uploads/${file.filename}`
          : null,

        sender: {
          connect: {
              id: Number(dto.senderId),
          },
        },

        receiver: {
          connect: {
               id: Number(dto.receiverId),
          },
        },

        sentDate: new Date(),
      },

      include: {
        sender: true,
        receiver: true,
      },
    });

    // 🔥 WEBSOCKET
    this.gateway.sendMessage(message);

    return message;
  }

  // ✅ GET ALL
  async findAll() {

    return await this.prisma.message.findMany({

      include: {
        sender: true,
        receiver: true,
      },

      orderBy: {
        sentDate: 'desc',
      },
    });
  }

  // ✅ GET ONE
  async findOne(id: number) {

    const message = await this.prisma.message.findUnique({

      where: { id },

      include: {
        sender: true,
        receiver: true,
      },
    });

    if (!message) {
      throw new NotFoundException(
        `Message #${id} not found`,
      );
    }

    return message;
  }

  // ✅ UPDATE
  async update(
    id: number,
    dto: UpdateMessageDto,
  ) {

    return await this.prisma.message.update({

      where: { id },

      data: {
        content: dto.content,
      },

      include: {
        sender: true,
        receiver: true,
      },
    });
  }

  // ✅ DELETE
  async remove(id: number) {

    return await this.prisma.message.delete({
      where: { id },
    });
  }

  // ✅ CONVERSATION BETWEEN 2 USERS
  async getConversation(
    user1Id: number,
    user2Id: number,
  ) {

    const conversation =
      await this.prisma.message.findMany({

        where: {
          OR: [
            {
              senderId: user1Id,
              receiverId: user2Id,
            },
            {
              senderId: user2Id,
              receiverId: user1Id,
            },
          ],
        },

        orderBy: {
          sentDate: 'asc',
        },

        include: {
          sender: true,
          receiver: true,
        },
      });

    if (conversation.length === 0) {
      return {
        message:
          'You can start your conversation',
        data: [],
      };
    }

    return conversation;
  }
  async markConversationAsRead(
  senderId: number,
  receiverId: number,
) {
  return this.prisma.message.updateMany({
    where: {
      senderId,
      receiverId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });
}
async unreadCount(userId:number){
console.log(userId)
   return this.prisma.message.count({

      where:{
         receiverId:userId,
         isRead:false
      }

   });

}
}